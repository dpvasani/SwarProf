# Artist Information Extraction API - FastAPI

A powerful FastAPI-based API for extracting artist information from documents using AI and OCR technologies.

## Features

- **Advanced Document Processing**: Supports PDF, DOCX, and various image formats
- **AI-Powered Extraction**: Uses Google's Gemini AI for intelligent information extraction
- **User Authentication**: JWT-based authentication with role-based access control
- **MongoDB Integration**: Persistent storage for users and extracted artist data
- **RESTful API**: Clean, well-documented API endpoints
- **High Accuracy**: Maintains the same extraction accuracy as the original implementation

## Technology Stack

- **FastAPI**: Modern, fast web framework for building APIs
- **MongoDB**: NoSQL database for flexible data storage
- **Google Gemini AI**: Advanced language model for information extraction
- **DocTR**: Document text recognition for OCR
- **PyMuPDF**: PDF processing
- **JWT**: Secure authentication tokens
- **Pydantic**: Data validation and serialization

## Installation

1. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start MongoDB**
   ```bash
   # Using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

4. **Run the application**
   ```bash
   python -m src.main
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
- `GET /auth/profile` - Get user profile

### Artist Extraction
- `POST /api/extract` - Extract artist information from uploaded file
- `GET /api/artists` - List all artists (paginated)
- `GET /api/artists/{artist_id}` - Get specific artist
- `GET /api/results` - List extraction results
- `GET /api/results/{result_id}` - Get specific result

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
curl -X POST "http://localhost:8000/api/extract" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@artist_document.pdf"
```

## Project Structure

```
Backend/src/
├── main.py                    # FastAPI app entry point
├── config.py                  # Configuration settings
├── database.py               # Database connection
├── controllers/
│   ├── user_controller.py     # User management logic
│   └── artist_controller.py   # Artist extraction logic
├── models/
│   ├── user_model.py         # User MongoDB operations
│   └── artist_model.py       # Artist MongoDB operations
├── routes/
│   ├── user_routes.py        # Authentication endpoints
│   └── artist_routes.py      # Artist extraction endpoints
├── schemas/
│   ├── user_schemas.py       # User Pydantic models
│   └── artist_schemas.py     # Artist Pydantic models
└── utils/
    ├── auth_utils.py         # JWT & password utilities
    ├── file_utils.py         # File handling utilities
    └── response_utils.py     # Response formatting
```

## API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## License

[Add your license information here]