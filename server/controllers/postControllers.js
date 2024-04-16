const Post = require('../models/PostModel')
const User = require('../models/userModel')
const path = require('path')
const fs = require('fs')
const {v4: uuid} = require('uuid')
const HttpError = require('../models/errorModel')
const { post } = require('../routes/postRoutes')

// =========================== CREATE A POST 
// POST : api/posts
// PROTECTED
const createPost = async (req, res, next) => {
        try {
            let { title, category, description } = req.body;  
            if (!title || !category || !description) {
                return next(new HttpError("Isi semua kolom dan pilih thumbnail.", 422))
            }
    
            const { thumbnail } = req.files;
    
            // Periksa ukuran file
            if (thumbnail.size > 2000000) {
                return next(new HttpError("Thumbnail terlalu besar. File harus kurang dari 2mb", 422))
            }
    
            let fileName = thumbnail.name;
            let splittedFilename = fileName.split('.');
            let newFileName = splittedFilename[0] + uuid() + "." + splittedFilename[splittedFilename.length - 1];
            
            // Pindahkan file thumbnail ke folder uploads
            thumbnail.mv(path.join(__dirname, '..', '/uploads', newFileName), async (err) => {
                if (err) {
                    return next(new HttpError(err))
                } else {
                    // Buat postingan baru dengan thumbnail yang benar
                    const newPost = await Post.create({
                        title,
                        category,
                        description,
                        thumbnail: newFileName,
                        creator: req.user.id
                    });
    
                    if (!newPost) {
                        return next(new HttpError("Postingan tidak dapat dibuat.", 422))
                    }
    
                    // Cari pengguna dan tambah jumlah postingannya sebanyak 1
                    const currentUser = await User.findById(req.user.id);
                    if (currentUser) {
                        // Pastikan `posts` adalah nilai numerik
                        let userPostCount = currentUser.posts || 0;
                        userPostCount += 1;
                        await User.findByIdAndUpdate(req.user.id, { posts: userPostCount });
                    } else {
                        console.error("Pengguna tidak ditemukan");
                    }
    
                    res.status(201).json(newPost);
                }
            });
        } catch (error) {
            return next(new HttpError(error))
        }
    }    

// =========================== GET all POST 
// GET : api/posts
// PROTECTED
const getPosts = async (req, res, next) => {
        try {
                const posts = await Post.find().sort({updateAt: -1})
                res.status(200).json(posts)
        } catch (error) {
                return next(new HttpError(error))
        }
}

// =========================== GET single POST 
// GET : api/posts/:id
// UNPROTECTED
const getPost = async (req, res, next) => {
        try {
                const postId = req.params.id;
                const post = await Post.findById(postId)
                if (!post) {
                        return next(new HttpError("Post not found.", 404))
                }
                res.json(post)
        } catch (error) {
                return next(new HttpError(error))
        }
}

// =========================== GET POSTS by category 
// GET : api/posts/categories/:category
// UNPROTECTED
const getCatPost = async (req, res, next) => {
        try {
                const {category} = req.params;
                const catPost = await Post.find({category}).sort({createAt: -1})
                res.status(200).json(catPost)

        } catch (error) {
                return next(new HttpError(error));
        }
}

// =========================== GET author post
// GET : api/posts/users/:id
// UNPROTECTED
const getUserPost = async (req, res, next) => {
        try {
              const {id} = req.params;
              const posts = await Post.find({creator: id}).sort({createAt: -1})
              res.status(200).json(posts)  
        } catch (error) {
                return next(new HttpError(error))
        }
}

// =========================== edit post
// PATCH : api/posts/:id
// UNPROTECTED
const editPost = async (req, res, next) => {
    try {
        let fileName;
        let newFileName;
        let updatePost;
        const postId = req.params.id;
        let { title, category, description } = req.body;
        
        if (!title || !category || description.length < 12) {
            return next(new HttpError("Isi semua kolom", 422))
        }

        // Get old post from database
        const oldPost = await Post.findById(postId);

        if (!oldPost) {
            return next(new HttpError("Post tidak ditemukan", 404));
        }

        // Check if the user is the creator of the post
        if (req.user.id === oldPost.creator.toString()) {
            if (!req.files) {
                updatePost = await Post.findByIdAndUpdate(postId, { title, category, description }, { new: true });
            } else {
                // Delete old thumbnail from uploads
                fs.unlink(path.join(__dirname, '..', 'uploads', oldPost.thumbnail), async (err) => {
                    if (err) {
                        return next(new HttpError(err))
                    }

                    // Upload new thumbnail
                    const { thumbnail } = req.files;

                    // Check file size
                    if (thumbnail.size > 2000000) {
                        return next(new HttpError("Thumbnail terlalu besar. File harus kurang dari 2mb", 422))
                    }

                    fileName = thumbnail.name;
                    let splittedFilename = fileName.split('.');
                    newFileName = splittedFilename[0] + uuid() + "." + splittedFilename[splittedFilename.length - 1];

                    thumbnail.mv(path.join(__dirname, '..', 'uploads', newFileName), async (err) => {
                        if (err) {
                            return next(new HttpError(err))
                        }

                        // Update post with new thumbnail
                        updatePost = await Post.findByIdAndUpdate(postId, { title, category, description, thumbnail: newFileName }, { new: true });
                        
                        if (!updatePost) {
                            return next(new HttpError("Tidak dapat mengupdate post.", 400))
                        }

                        res.status(200).json(updatePost);
                    });
                });
            }
        } else {
            return next(new HttpError("Anda tidak diizinkan mengedit post ini.", 403))
        }
    } catch (error) {
        return next(new HttpError(error))
    }
}
    

// =========================== delete post
// DELETE : api/posts/:id
// UNPROTECTED
const deletePost = async (req, res, next) => {
        try {
            const postId = req.params.id;
            if (!postId) {
                return next(new HttpError("Post unavailable", 400))
            }
    
            const post = await Post.findById(postId);
            if (!post) {
                return next(new HttpError("Post not found", 404));
            }
            const fileName = post?.thumbnail;
            if(req.user.id == post.creator) {
            // Delete thumbnail from uploads folder
            fs.unlink(path.join(__dirname, '..', 'uploads', fileName), async (err) => {
                if (err) {
                   return next(new HttpError(err))
                } else {
                   await Post.findByIdAndDelete(postId);
                   // Find user and reduce post count by 1
                   const currentUser = await User.findById(req.user.id);
                   const userPostCount = currentUser.posts - 1;
                   await User.findByIdAndUpdate(req.user.id, { posts: userPostCount });
                   res.status(200).json(`Post ${postId} deleted successfully`);
                }
            })
        } else {
                return next(new HttpError("post couldn't deleted"), 403)
        }
        } catch (error) {
            return next(new HttpError(error.message || "Failed to delete post", 500));
        }    
}

module.exports = {createPost, getPost, getPosts, getCatPost, getUserPost, editPost, deletePost};