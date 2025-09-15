# Artist Information Extraction API - FastAPI Version

A powerful FastAPI-based API for extracting artist information from documents using AI and OCR technologies.

## Features

- **Advanced Document Processing**: Supports PDF, DOCX, and various image formats
- **AI-Powered Extraction**: Uses Google's Gemini AI for intelligent information extraction
- **User Authentication**: JWT-based authentication with role-based access control
- **MongoDB Integration**: Persistent storage for users and extracted artist data
- **RESTful API**: Clean, well-documented API endpoints
- **High Accuracy**: Maintains the same extraction accuracy as the original Flask implementation

## Technology Stack

- **FastAPI**: Modern, fast web framework for building APIs
- **MongoDB**: NoSQL database for flexible data storage
- **Google Gemini AI**: Advanced language model for information extraction
- **DocTR**: Document text recognition for OCR
- **PyMuPDF**: PDF processing
- **JWT**: Secure authentication tokens
- **Pydantic**: Data validation and serialization

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Backend
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start MongoDB**
   ```bash
   # Using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   
   # Or install MongoDB locally
   ```

5. **Run the application**
   ```bash
   python app.py
   ```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DEBUG` | Enable debug mode | `False` |
| `HOST` | Server host | `0.0.0.0` |
| `PORT` | Server port | `8000` |
| `MONGODB_URL` | MongoDB connection string | `mongodb://localhost:27017` |
| `DATABASE_NAME` | Database name | `artist_extraction_db` |
| `JWT_SECRET` | JWT signing secret | Required |
| `GEMINI_API_KEY` | Google Gemini API key | Required |
| `MAX_FILE_SIZE` | Maximum upload file size | `16777216` (16MB) |

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login

### Artist Extraction
- `POST /extract` - Extract artist information from uploaded file
- `GET /artists` - List all artists (paginated)
- `GET /artists/{artist_id}` - Get specific artist
- `GET /results` - List extraction results
- `GET /results/{result_id}` - Get specific result

### System
- `GET /` - API documentation
- `GET /health` - Health check

## Usage Examples

### Register a User
```bash
curl -X POST "http://localhost:8000/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "full_name": "Test User",
    "password": "password123"
  }'
```

### Login
```bash
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username_or_email": "testuser",
    "password": "password123"
  }'
```

### Extract Artist Information
```bash
curl -X POST "http://localhost:8000/extract" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@artist_document.pdf"
```

## Data Models

### Artist Information Structure
```json
{
  "artist_name": "Artist Name",
  "guru_name": "Guru Name",
  "gharana_details": {
    "gharana_name": "Gharana Name",
    "style": "Classical Style",
    "tradition": "Cultural Tradition"
  },
  "biography": {
    "early_life": "Early life details",
    "background": "Background information",
    "education": "Educational background",
    "career_highlights": "Career highlights"
  },
  "achievements": [
    {
      "type": "award",
      "title": "Award Title",
      "year": "2023",
      "details": "Award details"
    }
  ],
  "contact_details": {
    "social_media": {
      "instagram": "@artist",
      "facebook": "facebook.com/artist"
    },
    "contact_info": {
      "phone": "+1234567890",
      "email": "artist@example.com"
    },
    "address": {
      "city": "City",
      "state": "State",
      "country": "Country"
    }
  },
  "summary": "AI-generated summary",
  "extraction_confidence": "high"
}
```

## Development

### Project Structure
```
Backend/
├── app.py                 # Main FastAPI application
├── config.py             # Configuration settings
├── database.py           # Database connection and utilities
├── models.py             # Pydantic models
├── auth.py               # Authentication utilities
├── extraction_service.py # AI extraction service
├── requirements.txt      # Python dependencies
├── .env.example         # Environment variables template
└── README.md            # This file
```

### Code Quality
- Type hints throughout the codebase
- Pydantic models for data validation
- Comprehensive error handling
- Modular architecture for maintainability
- Async/await for better performance

## API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Migration from Flask

This FastAPI version maintains 100% compatibility with the original Flask implementation while adding:
- Better performance with async/await
- Automatic API documentation
- Enhanced data validation
- Improved error handling
- Modular architecture
- Type safety

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

[Add your license information here]