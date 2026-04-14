import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: String,
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        projectRole: {
            type: String,
            enum: ['owner', 'editor', 'viewer'],
            default: 'viewer',
        },
    }],
    invitations: [{
        email: { type: String, required: true },
        token: { type: String, required: true },
        expires: { type: Date, required: true },
    }],
    isArchived: {
        type: Boolean,
        default: false
    },
    // status: {
    //     type: String,
    //     enum: ['active', 'suspended'],
    //     default: 'active',
    //     index: true
    // },
}, { timestamps: true });

const Project = mongoose.model('Project', projectSchema);
export default Project;
