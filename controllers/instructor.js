const User = require("../models/user");
const stripe = require("stripe")(process.env.STRIPE_SECRET);
const queryString = require("querystring");
const Course = require('../models/course')

const makeInstructor = async (req, res) => {
  try {
    const user = await User.findById(req.auth.id).exec();
    if (!user.stripe_account_id) {
      const account = await stripe.accounts.create({ type: "express" });
      user.stripe_account_id = account.id;
      user.save();
    }
console.log('STRIPE ID =>', user.stripe_account_id);
    let accountLink = await stripe.accountLinks.create({
      account: user.stripe_account_id,
      refresh_url: process.env.STRIPE_REDIRECT_URL,
      return_url: process.env.STRIPE_REDIRECT_URL,
      type: "account_onboarding",
    });

    accountLink = Object.assign(accountLink, {
      "stripe_user[email]": user.email,
    });
    res.send(`${accountLink.url}?${queryString.stringify(accountLink)}`);
  } catch (err) {
    console.log("makeInstructor err =>", err);
    res.status(500).json({ message: err });
  }
};

const getAccountStatus = async (req, res) => {
  try {
    const user = await User.findById(req.auth.id).exec();

    const account = await stripe.accounts.retrieve(user.stripe_account_id);

    if (!account.charges_enabled) {
      return res.status(401).send("Unauthorized");
    } else {
      const updateUserStripe = await User.findByIdAndUpdate(
        req.auth.id,
        {
          stripe_seller: account,
          $addToSet: { role: "Instructor" },
        },
        { new: true }
      )
        .select("-password")
        .exec();
      res.status(200).json(updateUserStripe);
    }
  } catch (err) {
    console.log("getAccountStatus =>", err);
  }
};

const currentInstructor = async (req, res) => {
  try {
    const user = await User.findById(req.auth.id).exec();
    if (!user.role.includes("Instructor")) {
      return res.status(403).json({ message: "Forbidden" });
    } else {
      res.status(200).json({ ok: true });
    }
  } catch (err) {
    console.log("currentInstructor =>", err);
    res.status(500).json({ message: "current Instructor error" });
  }
};

const instructorCourses = async (req, res)=>{
  try {
    const courses = await Course.find({instructor:req.auth.id}).sort({createAt: -1}).exec()
    res.status(200).json(courses)
  } catch (err) {
    console.log(err);
  }
}

const studentCount = async (req, res)=>{
  try {
    const users = await User.find({courses: req.body.courseId}).select('_id').exec()
    return res.status(200).json(users)
  } catch (err) {
    return res.status(400)
  }
}

const instructorBalance = async (req, res)=>{
  try {
    const user = await User.findById(req.auth.id).exec()

    const balance = await stripe.balance.retrieve({
      stripeAccount: user.stripe_account_id,
    })
    return res.json(balance)
  } catch (err) {
    return res.status(400)
  }
}

const instructorPayoutSetting = async (req, res)=>{
  try {
    const user = await User.findById(req.auth.id).exec()

    const loginLink = await stripe.account.createLoginLink(user.stripe_seller.id, {redirect_url: process.env.STRIPE_SETTINGS_REDIRECT})
    return res.json(loginLink.url)

  } catch (err) {
    return res.status(400)
  }
}

module.exports = { makeInstructor, getAccountStatus, currentInstructor, instructorCourses, studentCount, instructorBalance, instructorPayoutSetting };
