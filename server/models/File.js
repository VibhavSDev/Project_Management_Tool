import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
    task: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        required: true
    },
    uploader: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    filename: {
        type: String,
        required: true
    },
    originalname: {
        type: String,
        required: true
    },
    size: {
        type: Number
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const File = mongoose.model('File', fileSchema);
export default File;
