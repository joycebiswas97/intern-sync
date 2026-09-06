const Report = require("../models/Report");
const Joi = require("joi");

const reportSchema = Joi.object({
  listingId: Joi.string().optional(),
  reportedUserId: Joi.string().optional(),
  reason: Joi.string().required(),
  details: Joi.string().allow("").optional()
}).or("listingId", "reportedUserId"); // Require at least one target

const createReport = async (req, res) => {
  try {
    const { error, value } = reportSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: "Validation error", errors: error.details.map(d => d.message) });
    }

    const report = new Report({
      reporter: req.user._id,
      listing: value.listingId || undefined,
      reportedUser: value.reportedUserId || undefined,
      reason: value.reason,
      details: value.details
    });

    await report.save();

    return res.status(201).json({ message: "Report submitted successfully", report });
  } catch (error) {
    console.error("Create Report Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  createReport
};
