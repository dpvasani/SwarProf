import mongoose, { Schema } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

const artistSchema = new Schema(
  {
    // Basic Information
    artistName: {
      type: String,
      required: [true, "Artist name is required"],
      trim: true,
      index: true,
    },
    guruName: {
      type: String,
      trim: true,
      index: true,
    },
    gharana: {
      type: String,
      trim: true,
      index: true,
    },
    
    // Contact Details
    contactDetails: {
      phone: {
        type: String,
        trim: true,
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
      },
      address: {
        type: String,
        trim: true,
      },
      website: {
        type: String,
        trim: true,
      },
      instagram: {
        type: String,
        trim: true,
      },
      facebook: {
        type: String,
        trim: true,
      },
      twitter: {
        type: String,
        trim: true,
      },
      youtube: {
        type: String,
        trim: true,
      },
      linkedin: {
        type: String,
        trim: true,
      },
    },
    
    // Biography and Description
    biography: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    
    // AI-Generated Summary
    aiGeneratedSummary: {
      type: String,
      trim: true,
    },
    
    // Media
    profilePhoto: {
      type: String, // Cloudinary URL
    },
    
    // Document Information
    originalDocument: {
      filename: String,
      url: String, // Cloudinary URL
      fileType: {
        type: String,
        enum: ['pdf', 'doc', 'docx', 'jpeg', 'jpg', 'png'],
      },
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    },
    
    // Extraction Status
    extractionStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'verified'],
      default: 'pending',
    },
    
    // Raw extracted data for admin review
    rawExtractedData: {
      type: String,
    },
    
    // Verification and Admin Control
    isVerified: {
      type: Boolean,
      default: false,
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: {
      type: Date,
    },
    
    // Additional extracted fields (flexible)
    additionalFields: {
      type: Map,
      of: String,
    },
    
    // Created by (Admin who uploaded)
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for search functionality
artistSchema.index({ 
  artistName: 'text', 
  guruName: 'text', 
  gharana: 'text',
  biography: 'text' 
});

// Virtual for summary (what users can see)
artistSchema.virtual('summary').get(function() {
  return {
    artistName: this.artistName,
    guruName: this.guruName,
    gharana: this.gharana,
    profilePhoto: this.profilePhoto,
  };
});

// Method to get user-visible data
artistSchema.methods.getUserView = function() {
  return {
    _id: this._id,
    artistName: this.artistName,
    guruName: this.guruName,
    gharana: this.gharana,
    profilePhoto: this.profilePhoto,
    aiGeneratedSummary: this.aiGeneratedSummary,
    biography: this.biography,
    createdAt: this.createdAt,
  };
};

// Method to get admin view
artistSchema.methods.getAdminView = function() {
  return this.toObject({ virtuals: true });
};

// Add pagination plugin
artistSchema.plugin(mongoosePaginate);

export const Artist = mongoose.model("Artist", artistSchema);