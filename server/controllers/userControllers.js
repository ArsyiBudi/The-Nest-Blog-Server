const user = require('../models/userModel')
const jwt = require("jsonwebtoken")
const fs = require('fs')
const path = require('path')
const {v4: uuid} = require("uuid")
const HttpError = require("../models/errorModel");
const bcrypt = require('bcryptjs');

// ======================================= REGISTER NEW USER 
// POST : api/users/register
// UNPROTECTED


const registerUser = async (req, res, next) => {
    try {
        const {name, email, password, password2} = req.body;
        if (!name || !email || !password) {
            return next(new HttpError("fill in all fields.", 422))
        }

        const newEmail = email.toLowerCase()

        const emailExist = await user.findOne({email: newEmail})
        if(emailExist) {
            return next(new HttpError("Email already exist.", 422))
        }

        if((password.trim()).length < 6 ) {
            return next(new HttpError("Pasword should be at least 6 characters.", 422))
        }

        if(password !== password2) {
            return next(new HttpError("password do not match.", 422))
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)
        const newUser = await user.create({name, email: newEmail, password: hashedPassword })
        res.status(200).json(`New user ${newUser.email} registered`)
    } catch (error) {
        return next(new HttpError("User Registration Failed", 422))
    }
}

// ======================================= lOGIN REGISTERED USER
// POST : api/users/login
// UNPROTECTED
const LoginUser = async (req, res, next) => {
    try {
        const {email, password} = req.body;

        if (!email || !password) {
            return next(new HttpError("Fill in all fields.", 422))
        }

        const newEmail = email.toLowerCase()

        const foundUser = await user.findOne({email: newEmail})

        if(!foundUser) {
            return next(new HttpError("Invalid credentials.", 422))
        }

        const comparePass = await bcrypt.compare(password, foundUser.password)

        if(!comparePass) {
            return next(new HttpError("Invalid credentials.", 422))
        }

        const {_id: id, name} = foundUser;
        const token = jwt.sign({id, name}, process.env.JWT_SECRET, {expiresIn: "1d"});

        res.status(200).json({token, id, name});         

    } catch (error) {
        return next(new HttpError("Login failed. Please check your credentials.", 422))
    }
}

// ======================================= USER PROFILE 
// POST : api/users/:id 
//  PROTECTED
const getUser = async (req, res, next) => {
    try {
        const {id} = req.params;
        const founduser = await user.findById(id).select('-password')

        if(!founduser) {
            return next(new HttpError("User not found", 422))
        }

        res.status(200).json(founduser);
    } catch (error) {
        return next(new HttpError(error))
    }
}

// ======================================= CHANGE USER AVATAR (profile picture)
// POST : api/users/change-avatar
//  PROTECTED
const changeAvatar = async (req, res, next) => {
    try {
        if(!req.files.avatar) {
            return next(new HttpError("Please choose an Image.", 422))
        }

        // find user from database
        const finduser = await user.findById(req.user.id)

        // delete old avatar if exist 
        if(finduser.avatar) {
            fs.unlink(path.join(__dirname, '..', 'uploads', finduser.avatar), (err) => {
                if(err) {
                    return next(new HttpError(err))
                }
            })
        }

        const {avatar} = req.files;
        // check file size
        if(avatar.size > 500000) {
            return next(new HttpError("profile picture to big. should be less than 500kb"), 422)
        }

        let fileName;
        fileName = avatar.name;
        let splittedfilename = fileName.split('.')
        let newfilename = splittedfilename[0] + uuid() + '.' + splittedfilename[splittedfilename.length - 1]

        avatar.mv(path.join(__dirname, '..', 'uploads', newfilename), async (err) => {
            if (err) {
                return next(new HttpError(err))
            }

            const updateAvatar = await user.findByIdAndUpdate(req.user.id, {avatar: newfilename}, {new: true})

            if (!updateAvatar) {
                return next(new HttpError("Avatar couldn't be changed.", 422));
            }

            res.status(200).json(updateAvatar)
        })
    } catch (error) {
        return next(new HttpError(error));
    }
}   

// ======================================= EDIT USER DETAILS (from profile)
// POST : api/users/edit-user
//  PROTECTED
const editUser = async (req, res, next) => {
    try {
        const {name, email, currentPassword, newPassword, ConfirmNewPassword} = req.body;
        if(!name || !email || !currentPassword || !newPassword) {
            return next(new HttpError("Fill in all fields", 422))
        }

        // get user from database 
        const finduser = await user.findById(req.user.id);
        if(!finduser) {
            return next(new HttpError("User not found", 403))
        }

        // make sure new email doesn't already exist
        const emailExist = await user.findOne({email});
        // we want to update other details with/without changing the email 
        // (which is a unique id because we use it to lpgin)
        if(emailExist && (emailExist._id != req.user.id)) {
            return next(new HttpError("email already exist", 422))
        }

        // compare current password to db password
        const validatePassword = await bcrypt.compare(currentPassword, finduser.password);

        if(!validatePassword) {
            return next(new HttpError("Invalid current password", 422))
        }

        // compare new password
        if(newPassword !== ConfirmNewPassword) {
            return next(new HttpError("New password do not match", 422))
        }

        // hash new password
        const salt = await bcrypt.genSalt(10)
        const hash = await bcrypt.hash(newPassword, salt);

        // update user info in database
        const newInfo = await user.findByIdAndUpdate(req.user.id, {name, email, password: hash}, {new: true})
        res.status(200).json(newInfo)
    } catch (error) {
        return next(new HttpError(error))
    }
}  

// ======================================= EDIT USER DETAILS (from profile)
// POST : api/users/authors
// UNPROTECTED
const getAuthors = async (req, res, next) => {
    try {
        const authors = await  user.find().select('-password')
        res.json(authors)
    } catch (error) {
        return next(new HttpError(error))
    }
} 

module.exports = {registerUser, LoginUser, getUser, changeAvatar, editUser, getAuthors}