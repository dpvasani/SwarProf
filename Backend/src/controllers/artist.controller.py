#!/usr/bin/env python3
"""
Artist Information Extraction API
Simple Flask API based on the working Jupyter notebook code
"""

import os
import json
import fitz  # PyMuPDF
from pathlib import Path
from flask import Flask, request, jsonify
from doctr.io import DocumentFile
from doctr.models import ocr_predictor
import google.generativeai as genai
import re
from werkzeug.utils import secure_filename

app = Flask(__name__)

# Configuration
UPLOAD_FOLDER = 'uploads'
RESULTS_FOLDER = 'results'
ALLOWED_EXTENSIONS = {'pdf', 'docx', 'jpg', 'jpeg', 'png', 'bmp', 'tiff'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['RESULTS_FOLDER'] = RESULTS_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Create directories
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULTS_FOLDER, exist_ok=True)

# Configure Gemini API - Use environment variable or default
API_KEY = os.getenv('GEMINI_API_KEY', 'AIzaSyAVTP0198Qm3HSrwZn9jEle7ZcWPBBOMK8')
genai.configure(api_key=API_KEY)

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_text(path, dpi=300):
    """
    Extract text from PDF, DOCX, or image files
    Based on the working code from the notebook
    """
    print(f"Attempting to open: {path}")
    
    ext = Path(path).suffix.lower()
    print("File extension:", ext)

    if ext in [".pdf", ".docx"]:
        doc = fitz.open(path)
        print(f"Successfully opened document with {len(doc)} pages")
        all_text = []
        
        for i, page in enumerate(doc):
            print(f"Processing page {i+1}")
            text = page.get_text()
            all_text.append(text)
            print(f"Page {i+1} text length: {len(text)}")
        
        doc.close()
        result = "\n".join(all_text)
        print(f"Total extracted text length: {len(result)}")
        return result

    elif ext in [".jpeg", ".jpg", ".png", ".bmp", ".tiff"]:
        model = ocr_predictor(pretrained=True)
        doc = DocumentFile.from_images(path)
        result = model(doc)
        
        extracted_text = ""
        for page in result.pages:
            for block in page.blocks:
                for line in block.lines:
                    for word in line.words:
                        extracted_text += word.value + " "
                    extracted_text += "\n"
        
        print(f"✅ Extracted text length: {len(extracted_text)}")
        return extracted_text.strip()

    else:
        raise ValueError(f"Unsupported file type: {ext}")

def create_gemini_prompt(document_text):
    """
    Create a complete prompt for Gemini to extract artist information
    Based on the working prompt from the notebook
    """
    prompt_template = """
# Artist Information Extraction Task

You are an expert information extraction specialist. Please extract detailed information about artists/performers from the provided document text and format it as JSON.

## Required Information to Extract:

1. **Artist Name** - Full name of the artist/performer
2. **Guru Name** - Teacher/mentor/guru name (if mentioned)
3. **Gharana Details** - Musical/dance tradition, school, style
4. **Biography** - Background, early life, education details
5. **Achievements** - Awards, recognitions, performances, accomplishments
6. **Contact Details** - Phone, email, social media, address
7. **Summary** - Comprehensive summary based on extracted information

## Output Format (JSON):

```json
{{
  "artist_name": "Full name or null",
  "guru_name": "Guru name or null",
  "gharana_details": {{
    "gharana_name": "Gharana name or null",
    "style": "Style/tradition or null",
    "tradition": "Cultural tradition or null"
  }},
  "biography": {{
    "early_life": "Early life details or null",
    "background": "Background info or null", 
    "education": "Education details or null",
    "career_highlights": "Career highlights or null"
  }},
  "achievements": [
    {{
      "type": "award/performance/recognition",
      "title": "Achievement title",
      "year": "Year or null",
      "details": "Additional details or null"
    }}
  ],
  "contact_details": {{
    "social_media": {{
      "instagram": "Instagram handle/URL or null",
      "facebook": "Facebook profile or null", 
      "twitter": "Twitter handle or null",
      "youtube": "YouTube channel or null",
      "other": "Other social media or null"
    }},
    "contact_info": {{
      "phone": "Phone number or null",
      "email": "Email address or null",
      "website": "Website or null"
    }},
    "address": {{
      "full_address": "Complete address or null",
      "city": "City or null",
      "state": "State or null",
      "country": "Country or null"
    }}
  }},
  "summary": "AI-generated comprehensive summary",
  "extraction_confidence": "high/medium/low",
  "additional_notes": "Any other relevant information"
}}
```

## Guidelines:
- Only extract explicitly mentioned information
- Use null for missing information
- Handle OCR errors intelligently
- Focus on accuracy over completeness
- Generate a factual summary based only on extracted data

## Document Text to Analyze:

{document_text}

Please analyze the above text and provide the extracted information in the exact JSON format specified.
"""
    return prompt_template.format(document_text=document_text)

def save_extraction_results(filename, extracted_text, artist_info, results_folder):
    """
    Save extraction results to JSON file for future reference
    """
    import datetime
    
    # Create result filename based on original filename
    base_name = Path(filename).stem
    result_filename = f"{base_name}_extraction_result.json"
    result_path = os.path.join(results_folder, result_filename)
    
    # Create comprehensive result object
    result_data = {
        "processing_timestamp": datetime.datetime.now().isoformat(),
        "original_filename": filename,
        "processing_info": {
            "extracted_text_length": len(extracted_text),
            "text_preview": extracted_text[:300] + "..." if len(extracted_text) > 300 else extracted_text,
        },
        "extracted_text": extracted_text,
        "artist_info": artist_info
    }
    
    # Save to JSON file
    with open(result_path, 'w', encoding='utf-8') as f:
        json.dump(result_data, f, indent=2, ensure_ascii=False)
    
    return result_path

def extract_artist_info_with_gemini_improved(document_text):
    """
    Call Gemini API with better JSON parsing that handles markdown code blocks
    Based on the working function from the notebook
    """
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = create_gemini_prompt(document_text)
        
        response = model.generate_content(prompt)
        content = response.text.strip()
        
        # Handle markdown code blocks
        if "```json" in content:
            # Extract JSON from markdown code blocks
            json_match = re.search(r'```json\s*\n(.*?)\n```', content, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
            else:
                # Fallback: find JSON between { and }
                start = content.find('{')
                end = content.rfind('}') + 1
                json_str = content[start:end] if start != -1 and end > start else content
        else:
            # Try to find JSON directly
            start = content.find('{')
            end = content.rfind('}') + 1
            json_str = content[start:end] if start != -1 and end > start else content
        
        # Parse the cleaned JSON
        data = json.loads(json_str)
        print("✅ Successfully extracted and parsed artist information!")
        return data
        
    except json.JSONDecodeError as e:
        print(f"⚠️ JSON parsing error: {e}")
        print("But we got a response from Gemini. Saving raw response...")
        return {"raw_response": response.text, "parsing_error": str(e)}
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return {"error": str(e), "raw_response": response.text if 'response' in locals() else None}

# Flask Routes

@app.route('/', methods=['GET'])
def home():
    """API documentation endpoint"""
    return jsonify({
        "message": "Artist Information Extraction API",
        "version": "1.0",
        "endpoints": {
            "/": "This documentation",
            "/health": "Health check",
            "/extract": "POST - Extract artist information from uploaded file",
            "/results": "GET - List all saved extraction results",
            "/results/<filename>": "GET - Retrieve a specific saved result"
        },
        "supported_formats": list(ALLOWED_EXTENSIONS),
        "max_file_size": "16MB",
        "storage": {
            "uploaded_files": "Saved in uploads/ folder with timestamp",
            "extraction_results": "Saved in results/ folder as JSON"
        }
    })

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy", 
        "message": "Artist Extraction API is running",
        "gemini_configured": bool(API_KEY)
    })

@app.route('/extract', methods=['POST'])
def extract_artist_info():
    """
    Extract artist information from uploaded file
    
    Expected: multipart/form-data with 'file' field
    Returns: JSON with extracted artist information
    """
    # Check if file is present
    if 'file' not in request.files:
        return jsonify({"error": "No file provided. Please upload a file."}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    if not allowed_file(file.filename):
        return jsonify({
            "error": f"File type not allowed. Supported formats: {', '.join(ALLOWED_EXTENSIONS)}"
        }), 400
    
    try:
        # Save uploaded file permanently
        filename = secure_filename(file.filename)
        # Add timestamp to avoid filename conflicts
        import datetime
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        saved_filename = f"{timestamp}_{filename}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], saved_filename)
        file.save(file_path)
        
        print(f"Processing file: {filename} (saved as: {saved_filename})")
        
        # Extract text from document
        extracted_text = extract_text(file_path)
        
        if not extracted_text or len(extracted_text.strip()) < 10:
            return jsonify({
                "error": "Could not extract meaningful text from the document",
                "extracted_text_length": len(extracted_text) if extracted_text else 0
            }), 400
        
        # Get artist information using Gemini
        artist_info = extract_artist_info_with_gemini_improved(extracted_text)
        
        # Save extraction results
        result_path = save_extraction_results(
            saved_filename, 
            extracted_text, 
            artist_info, 
            app.config['RESULTS_FOLDER']
        )
        
        print(f"✅ Results saved to: {result_path}")
        
        return jsonify({
            "success": True,
            "filename": filename,
            "saved_filename": saved_filename,
            "extracted_text_length": len(extracted_text),
            "extracted_text_preview": extracted_text[:200] + "..." if len(extracted_text) > 200 else extracted_text,
            "artist_info": artist_info,
            "saved_file_path": file_path,
            "result_file_path": result_path
        })
        
    except Exception as e:
        print(f"Error processing file: {str(e)}")
        return jsonify({"error": f"Error processing file: {str(e)}"}), 500

@app.route('/results', methods=['GET'])
def list_results():
    """
    List all saved extraction results
    """
    try:
        results_files = []
        if os.path.exists(app.config['RESULTS_FOLDER']):
            for filename in os.listdir(app.config['RESULTS_FOLDER']):
                if filename.endswith('.json'):
                    file_path = os.path.join(app.config['RESULTS_FOLDER'], filename)
                    file_stat = os.stat(file_path)
                    results_files.append({
                        "filename": filename,
                        "size": file_stat.st_size,
                        "modified": file_stat.st_mtime,
                        "download_url": f"/results/{filename}"
                    })
        
        return jsonify({
            "success": True,
            "total_results": len(results_files),
            "results": results_files
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/results/<filename>', methods=['GET'])
def get_result(filename):
    """
    Get a specific saved result
    """
    try:
        if not filename.endswith('.json'):
            return jsonify({"error": "Invalid file format"}), 400
        
        file_path = os.path.join(app.config['RESULTS_FOLDER'], filename)
        if not os.path.exists(file_path):
            return jsonify({"error": "Result file not found"}), 404
        
        with open(file_path, 'r', encoding='utf-8') as f:
            result_data = json.load(f)
        
        return jsonify(result_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("🚀 Starting Artist Information Extraction API...")
    print(f"📁 Upload folder: {UPLOAD_FOLDER}")
    print(f"🔑 Gemini API configured: {'Yes' if API_KEY else 'No'}")
    print(f"📄 Supported formats: {', '.join(ALLOWED_EXTENSIONS)}")
    print("🌐 API will be available at: http://localhost:5000")
    print("📖 Documentation at: http://localhost:5000")
    
    app.run(debug=True, host='0.0.0.0', port=5000)