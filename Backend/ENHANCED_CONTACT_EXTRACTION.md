# Enhanced Artist Contact Details Extraction

## Overview

The artist extraction system has been enhanced to capture comprehensive contact details and social media information from uploaded documents. This ensures that all available contact information is extracted during the initial processing and can be enhanced later through AI.

## Enhanced Features

### 1. **Comprehensive Contact Details Schema**

The system now captures:

#### Contact Information
- **Multiple Phone Numbers**: Support for arrays of phone numbers
- **Multiple Email Addresses**: Support for arrays of email addresses
- **Website URLs**: Official or personal websites
- **Backward Compatibility**: Maintains `phone` and `email` fields for primary contacts

#### Social Media Platforms
- Instagram
- Facebook
- Twitter/X
- YouTube
- LinkedIn
- Spotify
- TikTok
- Snapchat
- Discord
- Other platforms

#### Address Information
- Full postal address
- City
- State/Province
- Country

### 2. **AI-Enhanced Extraction**

#### Initial Extraction
- Uses advanced Gemini AI prompts to extract contact details from documents
- Includes specific instructions to look for all types of contact information
- Sets fields to `null` when information is not found in the document

#### Pattern-Based Fallback
When AI is unavailable, the system uses pattern matching to extract:
- Phone numbers (Indian, US, and international formats)
- Email addresses
- Social media handles and URLs
- Website URLs
- Address information

### 3. **Enhancement Endpoint**

#### POST `/artists/{artist_id}/enhance`
- Re-processes existing artist data through AI
- Attempts to find missing contact details from reliable online sources
- Preserves existing non-null information
- Only fills in missing/null fields
- Returns enhanced artist data

## API Usage

### Initial Extraction
```bash
POST /extract
Content-Type: multipart/form-data

# Upload file - system automatically extracts all available contact details
```

### Enhance Existing Artist
```bash
POST /artists/{artist_id}/enhance
Authorization: Bearer {token}

# Response includes enhanced contact details
{
  "success": true,
  "artist_id": "...",
  "artist_name": "...",
  "enhanced_data": {
    "contact_details": {
      "social_media": {
        "instagram": "@artist_handle",
        "facebook": "facebook.com/artist",
        "youtube": "youtube.com/artistchannel",
        // ... other platforms
      },
      "contact_info": {
        "phone_numbers": ["+91-9876543210", "(555) 123-4567"],
        "emails": ["artist@email.com", "contact@artist.com"],
        "website": "https://artist-website.com"
      },
      "address": {
        "full_address": "123 Artist St, City, State, Country",
        "city": "City",
        "state": "State", 
        "country": "Country"
      }
    }
  }
}
```

## Data Structure

### Contact Details Schema
```json
{
  "contact_details": {
    "social_media": {
      "instagram": "string|null",
      "facebook": "string|null",
      "twitter": "string|null",
      "youtube": "string|null",
      "linkedin": "string|null",
      "spotify": "string|null",
      "tiktok": "string|null",
      "snapchat": "string|null",
      "discord": "string|null",
      "other": "string|null"
    },
    "contact_info": {
      "phone_numbers": ["string"]|null,
      "emails": ["string"]|null,
      "website": "string|null",
      "phone": "string|null",
      "email": "string|null"
    },
    "address": {
      "full_address": "string|null",
      "city": "string|null",
      "state": "string|null",
      "country": "string|null"
    }
  }
}
```

## Null Handling

The system properly handles missing information:
- Fields are set to `null` when information is not found in documents
- During enhancement, only `null` fields are updated
- Existing non-null information is preserved
- Empty arrays are used for multiple contact fields when no data is available

## Pattern Matching

The fallback extraction uses robust regex patterns:

### Phone Numbers
- Indian mobile: `+91-XXXXXXXXXX`
- US format: `(XXX) XXX-XXXX`
- International formats

### Email Addresses
- Standard email validation
- Supports multiple domains and formats

### Social Media
- Platform-specific URL patterns
- Handle extraction (@username)
- Full URL extraction

### Websites
- Domain extraction
- Protocol handling (http/https)
- Filtering out social media URLs

## Testing

Run the test suite:
```bash
cd Backend
python tests/test_enhanced_extraction.py
```

This validates:
- Pattern-based extraction
- Null handling
- Schema structure
- Contact detail extraction

## Error Handling

- Graceful fallback when AI is unavailable
- Validation through Pydantic schemas
- Proper error messages for missing artists
- Retry logic for enhancement failures

## Performance

- Pattern matching provides fast fallback extraction
- AI enhancement is optional and on-demand
- Cached results to avoid re-processing
- Optimized regex patterns for performance