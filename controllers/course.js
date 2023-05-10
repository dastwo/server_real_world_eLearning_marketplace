const AWS = require("aws-sdk");
const { readFileSync } = require("fs");
const nanoid = require("nanoid");
const Buffer = require("buffer").Buffer;
const slugify = require("slugify");
const Course = require("../models/course");
const User = require("../models/user");
const Completed = require("../models/completed");
const stripe = require("stripe")(process.env.STRIPE_SECRET);

const awsConfig = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
  apiVersion: process.env.AWS_API_VERSION,
};

const S3 = new AWS.S3(awsConfig);
const uploadImage = async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).send("no image");

    const base64Data = new Buffer.from(
      image.replace(/^data:image\/\w+;base64,/, ""),
      "base64"
    );

    const type = image.split(";")[0].split("/")[1];
    const params = {
      Bucket: "descdmy-bucket",
      Key: `${nanoid()}.${type}`,
      Body: base64Data,
      ACL: "public-read",
      ContentEncoding: "base64",
      ContentType: `image/${type}`,
    };
    S3.upload(params, (err, data) => {
      if (err) {
        return res.sendStatus(400);
      }

      return res.send(data);
    });
  } catch (err) {
    return res.status(400).send("upload image fill try agin");
  }
};

const removeImage = async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).send("no image");
    const params = {
      Bucket: image.Bucket,
      Key: image.Key,
    };

    S3.deleteObject(params, (err, data) => {
      if (err) {
        return res.sendStatus(400);
      }
      return res.status(200).send(data);
    });
  } catch (err) {
    return res.status(400).send("remove image fill try agin");
  }
};

const createCourse = async (req, res) => {
  try {
    const { name } = req.body;
    const alreadyExist = await Course.findOne({
      slug: slugify(name.toLowerCase()),
    });
    if (alreadyExist) return res.status(400).send("title is taken");

    const course = await new Course({
      slug: slugify(name),
      instructor: req.auth.id,
      ...req.body,
    }).save();
    return res.status(200).json(course);
  } catch (err) {
    return res.sendStatus(400);
  }
};

const getCourse = async (req, res) => {
  try {
    const course = await Course.findOne({ slug: req.params.slug })
      .populate("instructor", "_id name")
      .exec();
    res.status(200).json(course);
  } catch (err) {
    return res.sendStatus(400);
  }
};

const uploadVideo = async (req, res) => {
  try {
    const { id } = req.auth;
    const { instructorId } = req.params;
    if (id != instructorId) return res.status(403).send("Unauthorized");
    const { video } = req.files;
    if (!video) return res.status(400).send("No video");

    const params = {
      Bucket: "descdmy-bucket",
      Key: `${nanoid()}.${video.type.split("/")[1]}`,
      Body: readFileSync(video.path),
      ACL: "public-read",
      ContentType: video.type,
    };

    S3.upload(params, (err, data) => {
      if (err) {
        return res.sendStatus(400);
      }
      res.status(200).send(data);
    });
  } catch (err) {
    return res.status(400).send("Upload video failed");
  }
};

const removeVideo = async (req, res) => {
  try {
    const { id } = req.auth;
    const { instructorId } = req.params;
    if (id != instructorId) return res.status(403).send("Unauthorized");

    const { video } = req.body;

    const params = {
      Bucket: video.Bucket,
      Key: video.Key,
    };
    S3.deleteObject(params, (err, data) => {
      if (err) {
        return res.sendStatus(400);
      }
      return res.status(200).json(data);
    });
  } catch (err) {
    return res.status(400).send("remove video failed");
  }
};

const addLesson = async (req, res) => {
  try {
    const { id } = req.auth;
    const { instructorId, slug } = req.params;
    if (id != instructorId) return res.status(403).send("Unauthorized");
    const { video, title, content } = req.body;

    const UpdateCourseLesson = await Course.findOneAndUpdate(
      { slug },
      { $push: { lessons: { video, title, content, slug: slugify(title) } } },
      { new: true }
    )
      .populate("instructor", "_id name")
      .exec();
    return res.status(200).json(UpdateCourseLesson);
  } catch (err) {
    return res.status(400).send("Add lesson failed");
  }
};

const updateCourse = async (req, res) => {
  try {
    const { id } = req.auth;
    const { slug } = req.params;
    const { instructor } = req.body;

    if (id != instructor._id) return res.status(403).send("Unauthorized");

    const updateCourse = await Course.findOneAndUpdate(
      { slug },
      { ...req.body },
      { new: true }
    )
      .populate("instructor", "_id name")
      .exec();

    return res.status(200).json(updateCourse);
  } catch (err) {
    return res.status(400).send("remove lesson failed");
  }
};

const removeLesson = async (req, res) => {
  try {
    const { id } = req.auth;
    const { slug, lessonsId } = req.params;

    const course = await Course.findOne({ slug }).exec();
    if (id != course.instructor._id)
      return res.status(403).send("Unauthorized");

    const removeLessonCourse = await Course.findOneAndUpdate(
      { slug },
      { $pull: { lessons: { _id: lessonsId } } },
      { new: true }
    ).exec();

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(400).send("Update course failed");
  }
};

const updateLesson = async (req, res) => {
  try {
    const { id } = req.auth;
    const { slug, lessonsId } = req.params;
    const { _id, title, content, free_preview, video } = req.body;

    const course = await Course.findOne({ slug }).exec();
    if (id != course.instructor._id)
      return res.status(403).send("Unauthorized");

    const updateLessonCourse = await Course.updateOne(
      { "lessons._id": _id },
      {
        $set: {
          "lessons.$.title": title,
          "lessons.$.content": content,
          "lessons.$.video": video,
          "lessons.$.free_preview": free_preview,
        },
      },
      { new: true }
    ).exec();

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(400).send("Update lesson failed");
  }
};

const publishCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { id } = req.auth;
    const course = await Course.findById(courseId);

    if (id != course.instructor._id) {
      return res.status(403).send("Unauthorized");
    }

    const update = await Course.findByIdAndUpdate(
      courseId,
      { published: true },
      { new: true }
    ).exec();

    return res.status(200).json(update);
  } catch (err) {
    return res.status(400).send("Publish course failed");
  }
};

const unpublishCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { id } = req.auth;
    const course = await Course.findById(courseId);

    if (id != course.instructor._id) {
      return res.status(403).send("Unauthorized");
    }

    const update = await Course.findByIdAndUpdate(
      courseId,
      { published: false },
      { new: true }
    ).exec();

    return res.status(200).json(update);
  } catch (err) {
    return res.status(400).send("Unpublish course failed");
  }
};

const coursesPublish = async (req, res) => {
  try {
    const allCourses = await Course.find({ published: true })
      .populate("instructor", "_id name")
      .exec();
    return res.status(200).json(allCourses);
  } catch (err) {
    return res.sendStatus(400);
  }
};

const checkEnrollment = async (req, res) => {
  try {
    const { courseId } = req.params;

    const user = await User.findById(req.auth.id);

    let ids = [];
    let coursesLength = user.courses && user.courses.length;
    for (let i = 0; i < coursesLength; i++) {
      ids.push(user.courses[i].toString());
    }

    res.json({
      status: ids.includes(courseId),
      course: await Course.findById(courseId),
    });
  } catch (err) {
    return res.status(400).send("checkEnrollment failed");
  }
};

const freeEnrollment = async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId).exec();
    if (course.paid) return;

    const result = await User.findByIdAndUpdate(
      req.auth.id,
      {
        $addToSet: { courses: course._id },
      },
      { new: true }
    ).exec();
    return res
      .status(200)
      .json({
        message: "Congratulations You have successfully enrolled",
        course,
      });
  } catch (err) {
    return res.status(400).send("Enrollment create failed");
  }
};

const paidEnrollment = async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId)
      .populate("instructor")
      .exec();
    if (!course.paid) return;

    const fee = (course.price * 30) / 100;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: Math.round(course.price.toFixed(2) * 100),
            product_data: {
              name: course.name,
            },
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: Math.round(fee.toFixed(2) * 100),
        transfer_data: { destination: course.instructor.stripe_account_id },
      },
      success_url: `${process.env.STRIPE_SUCCESS_URL}/${course._id}`,
      cancel_url: process.env.STRIPE_CANCEL_URL,
    });

    await User.findByIdAndUpdate(req.auth.id, {
      stripeSession: session,
    }).exec();
    res.status(200).send(session.id);
  } catch (err) {
    return res.status(400).send("Paid enrollment failed");
  }
};

const stripeSuccess = async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId).exec();

    const user = await User.findById(req.auth.id).exec();

    if (!user.stripeSession.id) return res.sendStatus(400);

    const session = await stripe.checkout.sessions.retrieve(
      user.stripeSession.id
    );

    if (session.payment_status === "paid") {
      await User.findByIdAndUpdate(
        user._id,
        {
          $addToSet: { courses: course._id },
          $set: { stripeSession: {} },
        },
        { new: true }
      ).exec();
    }
    return res.status(200).json({ success: true, course });
  } catch (err) {
    return res
      .status(400)
      .json({ success: false, message: "Paid failed. Try again later" });
  }
};

const userCourses = async (req, res) => {
  try {
    const user = await User.findById(req.auth.id).exec();

    const courses = await Course.find({ _id: { $in: user.courses } })
      .populate("instructor", "_id name")
      .exec();

    res.status(200).json(courses);
  } catch (err) {
    return res.sendStatus(400);
  }
};

const markCompleted = async (req, res) => {
  try {
    const { courseId, lessonId } = req.body;

    const existing = await Completed.findOne({
      user: req.auth.id,
      course: courseId,
    });

    if (existing) {
      const update = await Completed.findOneAndUpdate(
        {
          user: req.auth.id,
          course: courseId,
        },
        { $addToSet: { lessons: lessonId } },
        { new: true }
      ).exec();
      return res.json({ ok: true });
    } else {
      const created = await new Completed({
        user: req.auth.id,
        course: courseId,
        lessons: lessonId,
      }).save();
      return res.json({ ok: true });
    }
  } catch (err) {
    return res.status(400).send("Mark completed failed");
  }
};

const listCompleted = async (req, res) => {
  try {
    const completedList = await Completed.findOne({
      course: req.body.courseId,
      user: req.auth.id,
    }).exec();
    
    const result = completedList ? completedList.lessons : []
    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).send("List completed failed.");
  }
};

const markIncomplete = async (req, res) => {
  try {
    const { courseId, lessonId } = req.body;

    const list = await Completed.findOneAndUpdate({
      user: req.auth.id,
      course: courseId,
    }, {$pull:{lessons:lessonId}},{new: true}).exec()
    
    return res.json({ok:true})
  } catch (err) {
    return res.status(400).send("Mark incomplete failed");
  }
};



module.exports = {
  uploadImage,
  removeImage,
  createCourse,
  getCourse,
  uploadVideo,
  removeVideo,
  addLesson,
  updateCourse,
  updateLesson,
  removeLesson,
  unpublishCourse,
  publishCourse,
  coursesPublish,
  checkEnrollment,
  freeEnrollment,
  paidEnrollment,
  stripeSuccess,
  userCourses,
  markCompleted,
  listCompleted,
  markIncomplete,
};
