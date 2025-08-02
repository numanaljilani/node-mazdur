import mongoose from 'mongoose';
const { Schema } = mongoose;

// User Schema
const userSchema = new Schema({
  fullname: { type: String, required: true },
  bio: { type: String },
  image: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  socialAuthName: { type: String },
  fcmtoken: { type: String },
  phone: { type: String },
  address: { type: String },
  dob: { type: String },
  nikname: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  isContractor: { type: Boolean, default: false },
  posts: [{ type: Schema.Types.ObjectId, ref: 'Post' }],
  comments: [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
  likes: [{ type: Schema.Types.ObjectId, ref: 'Like' }],
  bookmark: [{ type: Schema.Types.ObjectId, ref: 'Bookmark' }],
  booking: [{ type: Schema.Types.ObjectId, ref: 'Booking', as: 'ContractorBookings' }],
  userbooking: [{ type: Schema.Types.ObjectId, ref: 'Booking', as: 'UserBookings' }],
  notifications: [{ type: Schema.Types.ObjectId, ref: 'Notification' }],
  images: [{ type: Schema.Types.ObjectId, ref: 'Images' }],
  history: [{ type: String }],
  offer: { type: Schema.Types.ObjectId, ref: 'Offers' },
  bookmarks: [{ type: String }],
  service: { type: String },
  subService: [{ type: String }],
  availability: { type: Boolean },
  locality: { type: String },
  price: { type: String },
  unit: { type: String },
  about: { type: String },
  rating: { type: Number, default: 5 },
  rewies: { type: Number, default: 0 },
  refreshToken: { type: String },
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

// Middleware to hash password before saving
// import bcrypt from 'bcrypt';
// userSchema.pre('save', async function (next) {
//   if (this.isModified('password')) {
//     this.password = await bcrypt.hash(this.password, 10);
//   }
//   next();
// });

// Post Schema
const postSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  contractorId: { type: Schema.Types.ObjectId, required: true },
  text: { type: String },
  rating: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  comments: [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
  likes: [{ type: Schema.Types.ObjectId, ref: 'Like' }],
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

// OTP Schema
const otpSchema = new Schema({
  email: { type: String, required: true },
  otp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

// Bookmark Schema
const bookmarkSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  contractorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

// Booking Schema
const bookingSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  contractorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  status: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

// Offers Schema
const offersSchema = new Schema({
  percent: { type: Number, required: true },
  title: { type: String, required: true },
  desc: { type: String, required: true },
  promo: { type: String, required: true },
  expiry: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

// Notification Schema
const notificationSchema = new Schema({
  title: { type: String, required: true },
  desc: { type: String, required: true },
  type: { type: String, required: true },
  broadcast: { type: Boolean, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

// Comment Schema
const commentSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

// Ensure unique constraint for one comment per user per post
commentSchema.index({ userId: 1, postId: 1 }, { unique: true });

// Like Schema
const likeSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

// Ensure unique constraint for one like per user per post
likeSchema.index({ userId: 1, postId: 1 }, { unique: true });

// Images Schema
const imagesSchema = new Schema({
  imageurl: { type: String, required: true },
  contractor: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

// Create Mongoose Models
export const User = mongoose.model('User', userSchema);
export const Post = mongoose.model('Post', postSchema);
export const OTP = mongoose.model('OTP', otpSchema);
export const Bookmark = mongoose.model('Bookmark', bookmarkSchema);
export const Booking = mongoose.model('Booking', bookingSchema);
export const Offers = mongoose.model('Offers', offersSchema);
export const Notification = mongoose.model('Notification', notificationSchema);
export const Comment = mongoose.model('Comment', commentSchema);
export const Like = mongoose.model('Like', likeSchema);
export const Images = mongoose.model('Images', imagesSchema);