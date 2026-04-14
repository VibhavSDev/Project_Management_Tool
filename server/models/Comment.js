import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
    task: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Task',
        required: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    text: {
        type: String,
        required: true
    },
    reactions: [
        {
        emoji: {
            type: String,
            required: true,
        },
        users: [
            {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            },
        ],
        },
    ],
    mentions: [
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    ],
    isDeleted: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true });

const Comment = mongoose.model('Comment', commentSchema);
export default Comment;
