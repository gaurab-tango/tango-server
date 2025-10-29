import express from "express";
import DailyReport from "../models/DailyReport";
import MonthlySummary from "../models/MonthlySummary";

import dbConnect from "../utils/db";

const router = express.Router();

router.get("/server-date", async (req, res) => {
  const DATE = new Date();
  // const formattedDate = `${date.getDate()} ${date
  //   .toLocaleString("default", { month: "long" })
  //   .toUpperCase()} ${date.getFullYear()}`;
  const formattedDate = `${DATE.getUTCDate()} ${DATE.toLocaleString("default", {
    month: "long",
    timeZone: "UTC",
  }).toUpperCase()} ${DATE.getUTCFullYear()}`;

  res.status(200).send(formattedDate);
});

router.get("/latest-report", async (req, res): Promise<any> => {
  try {
    await dbConnect();

    const lastEntry = await DailyReport.findOne({})
      .sort({ date: -1 }) // Most recent date first
      .lean(); // Plain JS object for faster read

    if (!lastEntry) {
      return res.status(404).json({ message: "No daily reports found." });
    }

    res.status(200).json(lastEntry);
  } catch (error) {
    res
      .status(500)
      .json({
        error: "Internal Server Error",
        details: (error as Error).message,
      });
  }
});

router.get("/latest-month-summary", async (req, res): Promise<any> => {
  try {
    await dbConnect();

    const latestSummary = await MonthlySummary.findOne({})
      .sort({ year: -1, month: -1 }) // Sort by latest year, then month
      .lean();

    if (!latestSummary) {
      return res.status(404).json({ message: "No monthly summary found." });
    }

    res.status(200).json(latestSummary);
  } catch (error) {
    res
      .status(500)
      .json({
        error: "Internal Server Error",
        details: (error as Error).message,
      });
  }
});

router.get("/month-summary/:year/:month", async (req, res): Promise<any> => {
  // router.get('/month-summary', async (req, res):Promise<any> => {
  const { year, month } = req.params;
  //   const year = "2025";
  //   const month = "6";
  try {
    await dbConnect();

    const summary = await MonthlySummary.findOne({
      year: parseInt(year),
      month: parseInt(month),
    }).lean();
    //      const result = await MonthlySummary.findOne({
    //       year: parseInt(year),
    //       month: parseInt(month),
    //     }).lean().explain('executionStats');
    // console.log(result);
    if (!summary) {
      return res.status(404).json({ message: "Monthly summary not found." });
    }

    res.status(200).json(summary);
  } catch (error) {
    res
      .status(500)
      .json({
        error: "Internal Server Error",
        details: (error as Error).message,
      });
  }
});

router.get("/month-daily-reports/:year/:month",
  async (req, res): Promise<any> => {
    const { year, month } = req.params;

    try {
      await dbConnect();

      const dailyReports = await DailyReport.find({
        year: parseInt(year),
        month: parseInt(month),
      })
        .sort({ date: 1 })
        .lean(); // Sort by ascending date

      if (dailyReports.length === 0) {
        return res
          .status(404)
          .json({
            message: "No daily reports found for the given month and year.",
          });
      }

      res.status(200).json(dailyReports);
    } catch (error) {
      res
        .status(500)
        .json({
          error: "Internal Server Error",
          details: (error as Error).message,
        });
    }
  }
);

router.get("/report-on/:year/:month/:day", async (req, res) => {
  await dbConnect();
  const { year, month, day } = req.params;

  try {
    const report = await DailyReport.findOne({ year, month, day });
    if (!report) {
      res.status(404).json({ message: "Report not found" });
      return 
    }
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error});
  }
});


router.put("/edit-report/:year/:month/:day", async (req, res) => {
  const { year, month, day } = req.params;
  const newData = req.body;
  const secretPassword = req.body.secretPassword; // secret password in the body

  if (secretPassword !== process.env.ALTER_VALUES_PASSWORD) {
    res.status(400).json({ message: "Wrong alter password" });
    return;
  }

  try {
    await dbConnect();
    // Find the existing daily report by date (year, month, day)
    const existingReport = await DailyReport.findOne({
      year: +year,
      month: +month,
      day: +day,
    });
    if (!existingReport) {
      res
        .status(404)
        .json({ message: "Daily report not found for the given date." });
      return;
    }

    // Store old values for difference calculation
    const prevReport = existingReport.toObject();

    // Update the report fields with new data
    Object.assign(existingReport, newData);

    // Save updated daily report
    await existingReport.save();

    // Find the monthly summary for the given month and year
    const monthlySummary = await MonthlySummary.findOne({
      year: +year,
      month: +month,
    });
    if (!monthlySummary) {
      res
        .status(404)
        .json({
          message: "Monthly summary not found for the given month and year.",
        });
      return;
    }

    const totalAvailableRooms = Number(process.env.TOTAL_ROOMS) || 1;

    // Calculate differences between new and previous report values
    const diffRoomSold = (newData.roomSold || 0) - (prevReport.roomSold || 0);
    const diffRoomRevenue =
      (newData.roomRevenue || 0) - (prevReport.roomRevenue || 0);
    const diffRestaurantSale =
      (newData.restaurantSale || 0) - (prevReport.restaurantSale || 0);
    const diffMealPlanSale =
      (newData.mealPlanSale || 0) - (prevReport.mealPlanSale || 0);
    const diffBarSale = (newData.barSale || 0) - (prevReport.barSale || 0);
    const diffCld = (newData.cld || 0) - (prevReport.cld || 0);
    const diffCake = (newData.cake || 0) - (prevReport.cake || 0);
    const diffExpense = (newData.expense || 0) - (prevReport.expense || 0);
    const diffCashDeposit =
      (newData.cashDeposit || 0) - (prevReport.cashDeposit || 0);
    const diffPettyCash =
      (newData.pettyCash || 0) - (prevReport.pettyCash || 0);
    const diffTotalRevenue =
      (newData.totalRevenue || 0) - (prevReport.totalRevenue || 0);

    // Number of daily reports (daysCount) for this month and year - needed for averages
    const daysCount = await DailyReport.countDocuments({
      month: +month,
      year: +year,
    });

    // Update monthly summary totals according to differences
    monthlySummary.totalRoomSold += diffRoomSold;
    monthlySummary.totalRoomRevenue += diffRoomRevenue;
    monthlySummary.totalRestaurantSale += diffRestaurantSale;
    monthlySummary.totalMealPlanSale += diffMealPlanSale;
    monthlySummary.totalBarSale += diffBarSale;
    monthlySummary.totalCld += diffCld;
    monthlySummary.totalCake += diffCake;
    monthlySummary.totalExpense += diffExpense;
    monthlySummary.totalCashDeposit += diffCashDeposit;
    monthlySummary.totalPettyCash += diffPettyCash;
    monthlySummary.totalMonthRevenue += diffTotalRevenue;

    // Recalculate averages and ratios
    monthlySummary.avgRoomPerDay = monthlySummary.totalRoomSold / daysCount;
    monthlySummary.avgOccupancy =
      (monthlySummary.totalRoomSold * 100) / (totalAvailableRooms * daysCount);
    monthlySummary.arr = 
  monthlySummary.totalRoomSold > 0
    ? monthlySummary.totalRoomRevenue / monthlySummary.totalRoomSold
    : 0;

    monthlySummary.revPerRoom =
      monthlySummary.totalRoomRevenue / (totalAvailableRooms * daysCount);

    await monthlySummary.save();

    res
      .status(200)
      .json({
        message: "Daily report and monthly summary updated successfully.",
      });
  } catch (error) {
    console.error("Error updating report:", error);
    res
      .status(500)
      .json({
        error: "Internal Server Error",
        details: (error as Error).message,
      });
  }
});

export default router;
