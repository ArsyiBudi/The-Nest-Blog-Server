const user = require('../models/userModel')
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
    res.json("Login User")
}

// ======================================= USER PROFILE 
// POST : api/users/:id 
//  PROTECTED
const getUser = async (req, res, next) => {
    res.json("User Profile")
}

// ======================================= CHANGE USER AVATAR (profile picture)
// POST : api/users/change-avatar
//  PROTECTED
const changeAvatar = async (req, res, next) => {
    res.json("Change User Profile")
}   

// ======================================= EDIT USER DETAILS (from profile)
// POST : api/users/edit-user
//  PROTECTED
const editUser = async (req, res, next) => {
    res.json("Edit User Details")
}  

// ======================================= EDIT USER DETAILS (from profile)
// POST : api/users/authors
// UNPROTECTED
const getAuthors = async (req, res, next) => {
    res.json("Get all users/authors")
} 

module.exports = {registerUser, LoginUser, getUser, changeAvatar, editUser, getAuthors}