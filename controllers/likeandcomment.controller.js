import mongoose from 'mongoose';
import { Like, Comment, Post, User } from '../models/Schema.js';

// Add a like to a post
export const addLike = async (req, res) => {
  try {
    const { postId } = req.params;
    const { user: authUser } = req; // From authenticateToken middleware
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ error: 'Invalid post ID' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const existingLike = await Like.findOne({ userId: authUser.id, postId });
    if (existingLike) {
      return res.status(400).json({ error: 'User already liked this post' });
    }

    const like = new Like({ userId: authUser.id, postId });
    await like.save();

    // Update post's likes array
    post.likes.push(like._id);
    await post.save();

    // Update user's likes array
    await User.findByIdAndUpdate(authUser.id, { $push: { likes: like._id } });

    res.status(201).json({ message: 'Like added successfully', like });
  } catch (error) {
    res.status(500).json({ error: `Failed to add like: ${error.message}` });
  }
};

// Remove a like from a post
export const removeLike = async (req, res) => {
  try {
    const { postId } = req.params;
    const { user: authUser } = req; // From authenticateToken middleware
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ error: 'Invalid post ID' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const like = await Like.findOne({ userId: authUser.id, postId });
    if (!like) {
      return res.status(404).json({ error: 'Like not found' });
    }

    await Like.deleteOne({ _id: like._id });

    // Remove like from post's likes array
    post.likes = post.likes.filter((id) => id.toString() !== like._id.toString());
    await post.save();

    // Remove like from user's likes array
    await User.findByIdAndUpdate(authUser.id, { $pull: { likes: like._id } });

    res.json({ message: 'Like removed successfully' });
  } catch (error) {
    res.status(500).json({ error: `Failed to remove like: ${error.message}` });
  }
};

// Get likes for a post with pagination
export const getLikes = async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ error: 'Invalid post ID' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const likes = await Like.find({ postId })
      .populate('userId', 'fullname email')
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .lean();

    const total = await Like.countDocuments({ postId });

    res.json({
      likes,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch likes: ${error.message}` });
  }
};

// Add a comment to a post
export const addComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { user: authUser } = req; // From authenticateToken middleware
    const { text } = req.body;
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ error: 'Invalid post ID' });
    }

    if (!text) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const existingComment = await Comment.findOne({ userId: authUser.id, postId });
    if (existingComment) {
      return res.status(400).json({ error: 'User already commented on this post' });
    }

    const comment = new Comment({ userId: authUser.id, postId, text });
    await comment.save();

    // Update post's comments array
    post.comments.push(comment._id);
    await post.save();

    // Update user's comments array
    await User.findByIdAndUpdate(authUser.id, { $push: { comments: comment._id } });

    res.status(201).json({ message: 'Comment added successfully', comment });
  } catch (error) {
    res.status(500).json({ error: `Failed to add comment: ${error.message}` });
  }
};

// Update a comment
export const updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { user: authUser } = req; // From authenticateToken middleware
    const { text } = req.body;
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ error: 'Invalid comment ID' });
    }

    if (!text) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.userId.toString() !== authUser.id) {
      return res.status(403).json({ error: 'Unauthorized to update this comment' });
    }

    comment.text = text;
    comment.updatedAt = Date.now();
    await comment.save();

    res.json({ message: 'Comment updated successfully', comment });
  } catch (error) {
    res.status(500).json({ error: `Failed to update comment: ${error.message}` });
  }
};

// Delete a comment
export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { user: authUser } = req; // From authenticateToken middleware
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ error: 'Invalid comment ID' });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.userId.toString() !== authUser.id) {
      return res.status(403).json({ error: 'Unauthorized to delete this comment' });
    }

    await Comment.deleteOne({ _id: comment._id });

    // Remove comment from post's comments array
    await Post.findByIdAndUpdate(comment.postId, { $pull: { comments: comment._id } });

    // Remove comment from user's comments array
    await User.findByIdAndUpdate(authUser.id, { $pull: { comments: comment._id } });

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: `Failed to delete comment: ${error.message}` });
  }
};

// Get comments for a post with pagination
export const getComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ error: 'Invalid post ID' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const comments = await Comment.find({ postId })
      .populate('userId', 'fullname email')
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .lean();

    const total = await Comment.countDocuments({ postId });

    res.json({
      comments,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch comments: ${error.message}` });
  }
};