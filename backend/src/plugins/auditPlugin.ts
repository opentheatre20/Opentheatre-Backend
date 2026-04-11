import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditable extends Document {
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: Schema.Types.ObjectId | null;
  version: number;
  previousVersions: any[];
  updatedBy: Schema.Types.ObjectId | null;
}

export function auditPlugin(schema: Schema, options?: any) {
  // Add common audit fields to the schema
  schema.add({
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    version: { type: Number, default: 1 },
    previousVersions: { type: Array, default: [] },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  });

  // Exclude soft-deleted documents from all queries by default
  const excludeDeleted = function (this: any, next?: Function) {
    if (this._conditions && this._conditions.isDeleted === undefined) {
      this.where({ isDeleted: { $ne: true } });
    }
    if (typeof next === 'function') {
      next();
    }
  };

  schema.pre('find' as any, excludeDeleted);
  schema.pre('findOne' as any, excludeDeleted);
  schema.pre('countDocuments' as any, excludeDeleted);
  schema.pre('aggregate' as any, function (this: any, next?: Function) {
    const pipeline = this.pipeline();
    // Only inject match if it's not explicitly fetching deleted items
    // and ideally at the beginning of the pipeline
    if (pipeline.length > 0 && pipeline[0].$match && pipeline[0].$match.isDeleted === undefined) {
      pipeline[0].$match.isDeleted = { $ne: true };
    } else if (pipeline.length === 0 || !pipeline[0].$match) {
      pipeline.unshift({ $match: { isDeleted: { $ne: true } } });
    }
    if (typeof next === 'function') {
      next();
    }
  });

  // Pre-save hook to handle versioning
  schema.pre('save' as any, function (this: any, next?: Function) {
    if (this.isNew) {
      if (typeof next === 'function') return next();
      return;
    }

    if (this.isModified()) {
      // Create a snapshot of the document before changes are saved
      // (Using this.$original or similar is ideal, but for simplicity we store the current state minus version array)
      const docObj = this.toObject();
      delete docObj.previousVersions; // Don't nest the entire history array inside itself
      delete docObj.version;

      this.previousVersions.push({
        _id: new mongoose.Types.ObjectId(), // Give the version its own ID
        snapshot: docObj,
        savedAt: new Date(),
        versionNumber: this.version
      });

      // Increment version number
      this.version += 1;
    }
    if (typeof next === 'function') next();
  });

  // Pre-findOneAndUpdate hook to handle versioning
  schema.pre('findOneAndUpdate' as any, async function (this: any, next?: Function) {
    const docToUpdate = await this.model.findOne(this.getQuery());
    if (docToUpdate) {
      const docObj = docToUpdate.toObject();
      delete docObj.previousVersions;
      delete docObj.version;

      // Use $push and $inc to update the versioning fields
      this.set({
        $push: {
          previousVersions: {
            snapshot: docObj,
            savedAt: new Date(),
            versionNumber: docToUpdate.version || 1
          }
        },
        $inc: { version: 1 }
      });
    }
    if (typeof next === 'function') next();
  });
}
