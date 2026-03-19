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
    res.status(500).json({
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
    res.status(500).json({
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
    res.status(500).json({
      error: "Internal Server Error",
      details: (error as Error).message,
    });
  }
});

router.get(
  "/month-daily-reports/:year/:month",
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
        return res.status(404).json({
          message: "No daily reports found for the given month and year.",
        });
      }

      res.status(200).json(dailyReports);
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        details: (error as Error).message,
      });
    }
  },
);

router.get("/date-range-summary", async (req, res): Promise<any> => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: "Please provide startDate and endDate (e.g., YYYY-MM-DD).",
      });
    }

    // await dbConnect(); // Uncomment if you are handling connections here

    // 1. Parse dates to ensure they cover the full days (start of day to end of day)
    const start = new Date(startDate as string);
    start.setUTCHours(0, 0, 0, 0);

    let end = new Date(endDate as string);
end = new Date(end.setDate(end.getDate() + 1));

    // Calculate exact number of days requested (inclusive)
    const msPerDay = 1000 * 60 * 60 * 24;
    const cumulativeTotalDays = Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1;

    // 2. Fetch Exact Range Summary using Aggregation on DailyReport
    const dailyAggregation = await DailyReport.aggregate([
      {
        $match: {
          date: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: null,
          totalRoomSold: { $sum: "$roomSold" },
          totalRoomRevenue: { $sum: "$roomRevenue" },
          totalRestaurantSale: { $sum: "$restaurantSale" },
          totalMealPlanSale: { $sum: "$mealPlanSale" },
          totalBarSale: { $sum: "$barSale" },
          totalCld: { $sum: "$cld" },
          totalCake: { $sum: "$cake" },
          totalExpense: { $sum: "$expense" },
          totalCashDeposit: { $sum: "$cashDeposit" },
          totalPettyCash: { $sum: "$pettyCash" },
          totalMonthRevenue: { $sum: "$totalRevenue" },
          totalUpiDeposit: { $sum: "$upiDeposit" },
          totalCashReceived: { $sum: "$cashReceived" },
          totalAdult: { $sum: "$totalAdultPax" },
          totalChild: { $sum: "$totalChildPax" },
          totalSpa: { $sum: "$spaSale" }, // Mapped new field
          reportsFound: { $sum: 1 }, // Just to see how many days were actually entered
        },
      },
    ]);

    // Extract the aggregated data (fallback to 0s if no reports found)
    const aggResult = dailyAggregation[0] || {
      totalRoomSold: 0,
      totalRoomRevenue: 0,
      totalRestaurantSale: 0,
      totalMealPlanSale: 0,
      totalBarSale: 0,
      totalCld: 0,
      totalCake: 0,
      totalExpense: 0,
      totalCashDeposit: 0,
      totalPettyCash: 0,
      totalMonthRevenue: 0,
      totalUpiDeposit: 0,
      totalCashReceived: 0,
      totalAdult: 0,
      totalChild: 0,
      totalSpa: 0,
      reportsFound: 0,
    };

    // 3. Perform Precise Average Calculations
    const totalAvailableRooms = Number(process.env.TOTAL_ROOMS) || 56;
    const totalInventoryOverPeriod = totalAvailableRooms * cumulativeTotalDays;

    let arr = 0;
    let avgOccupancy = 0;
    let revPerRoom = 0;

    if (aggResult.totalRoomSold > 0) {
      arr = +(aggResult.totalRoomRevenue / aggResult.totalRoomSold).toFixed(2);
    }

    if (totalInventoryOverPeriod > 0) {
      avgOccupancy = +((aggResult.totalRoomSold * 100) / totalInventoryOverPeriod).toFixed(2);
      revPerRoom = +(aggResult.totalRoomRevenue / totalInventoryOverPeriod).toFixed(2);
    }

    // Construct the final combined summary object
    const combinedSummary = {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
      daysInDateRange: cumulativeTotalDays,
      reportsFound: aggResult.reportsFound,
      ...aggResult,
      arr,
      avgOccupancy,
      revPerRoom,
    };
    delete combinedSummary._id; // clean up MongoDB _id from the spread

    // 4. Fetch the Monthly Summary array for the frontend (Previous Style)
    // Calculate the integer values for $expr filtering (YYYYMM)
    const startVal = start.getFullYear() * 100 + (start.getMonth() + 1);
    const endVal = end.getFullYear() * 100 + (end.getMonth() + 1);

    const monthlyReports = await MonthlySummary.find({
      $expr: {
        $and: [
          { $gte: [{ $add: [{ $multiply: ["$year", 100] }, "$month"] }, startVal] },
          { $lte: [{ $add: [{ $multiply: ["$year", 100] }, "$month"] }, endVal] },
        ],
      },
    })
      .sort({ year: 1, month: 1 })
      .lean();

    // 5. Return Response
    res.status(200).json({
      combinedSummary,
      monthlyReports,
    });
  } catch (error) {
    console.error("Error fetching custom range report:", error);
    res.status(500).json({
      error: "Internal Server Error",
      details: (error as Error).message,
    });
  }
});

router.get("/report-on/:year/:month/:day", async (req, res) => {
  await dbConnect();
  const { year, month, day } = req.params;

  try {
    const report = await DailyReport.findOne({ year, month, day });
    if (!report) {
      res.status(404).json({ message: "Report not found" });
      return;
    }
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
});

router.put("/edit-report/:year/:month/:day", async (req, res) => {
  const { year, month, day } = req.params;
  const { secretPassword, newYear, newMonth, newDay, ...newData } = req.body;

  // 1. Auth check
  if (secretPassword !== process.env.ALTER_VALUES_PASSWORD) {
    res.status(400).json({ message: "Wrong alter password" });
    return;
  }

  try {
    await dbConnect();

    // 2. Find the existing report at the OLD date
    const existingReport = await DailyReport.findOne({
      year: +year,
      month: +month,
      day: +day,
    });

    if (!existingReport) {
      res.status(404).json({ message: "Daily report not found for the given date." });
      return;
    }

    // 3. Determine if the date is actually changing
    const targetYear  = newYear  ? +newYear  : +year;
    const targetMonth = newMonth ? +newMonth : +month;
    const targetDay   = newDay   ? +newDay   : +day;

    const isDateChanging =
      targetYear !== +year ||
      targetMonth !== +month ||
      targetDay !== +day;

    // 4. If date is changing, check no report already exists at the new date
    if (isDateChanging) {
      const conflict = await DailyReport.findOne({
        year: targetYear,
        month: targetMonth,
        day: targetDay,
      });

      if (conflict) {
        res.status(409).json({
          message: `A report already exists for ${targetDay}/${targetMonth}/${targetYear}. Cannot move report to this date.`,
        });
        return;
      }
    }

    // 5. Store old values before any changes
    const prevReport = existingReport.toObject();

    // 6. Apply new data cleanly (strip null/undefined)
    const cleanData = Object.fromEntries(
      Object.entries(newData).filter(([_, v]) => v !== null && v !== undefined)
    );
    Object.assign(existingReport, cleanData);

    // 7. Apply new date if changing
    if (isDateChanging) {
      existingReport.day   = targetDay;
      existingReport.month = targetMonth;
      existingReport.year  = targetYear;
      existingReport.date  = new Date(targetYear, targetMonth - 1, targetDay);
    }

    await existingReport.save();

    const totalAvailableRooms = Number(process.env.TOTAL_ROOMS) || 1;

    // -------------------------------------------------------
    // 8. MONTHLY SUMMARY LOGIC
    // -------------------------------------------------------

    const isSameMonth = targetYear === +year && targetMonth === +month;

    if (isSameMonth) {
      // ── Same month: just apply diffs as before ──────────────

      const monthlySummary = await MonthlySummary.findOne({
        year: +year,
        month: +month,
      });

      if (!monthlySummary) {
        res.status(404).json({ message: "Monthly summary not found." });
        return;
      }

      const daysCount = await DailyReport.countDocuments({
        month: +month,
        year: +year,
      });

      applyDiffs(monthlySummary, existingReport, prevReport);
      recalculateAverages(monthlySummary, totalAvailableRooms, daysCount);

      await monthlySummary.save();

    } else {
      // ── Date moved to a different month ─────────────────────
      // A) Subtract old report values from OLD monthly summary
      // B) Add new report values to NEW monthly summary (create if needed)

      // A) OLD monthly summary — subtract the old report entirely
      const oldMonthlySummary = await MonthlySummary.findOne({
        year: +year,
        month: +month,
      });

      if (!oldMonthlySummary) {
        res.status(404).json({ message: "Old monthly summary not found." });
        return;
      }

      subtractReport(oldMonthlySummary, prevReport);

      const oldDaysCount = await DailyReport.countDocuments({
        month: +month,
        year: +year,
      });

      if (oldDaysCount === 0) {
        // No more reports in this month — delete the summary or zero it out
        await oldMonthlySummary.deleteOne();
      } else {
        recalculateAverages(oldMonthlySummary, totalAvailableRooms, oldDaysCount);
        await oldMonthlySummary.save();
      }

      // B) NEW monthly summary — add the updated report values
      const newDaysCount = await DailyReport.countDocuments({
        month: targetMonth,
        year: targetYear,
      });

      let newMonthlySummary = await MonthlySummary.findOne({
        year: targetYear,
        month: targetMonth,
      });

      if (newMonthlySummary) {
        addReport(newMonthlySummary, existingReport);
        recalculateAverages(newMonthlySummary, totalAvailableRooms, newDaysCount);
        await newMonthlySummary.save();
      } else {
        // No summary exists for target month yet — create one
        newMonthlySummary = new MonthlySummary({
          month: targetMonth,
          year: targetYear,
          totalRoomSold:       existingReport.roomSold,
          totalRoomRevenue:    existingReport.roomRevenue,
          totalRestaurantSale: existingReport.restaurantSale,
          totalMealPlanSale:   existingReport.mealPlanSale,
          totalBarSale:        existingReport.barSale,
          totalSpa:            existingReport.spaSale,
          totalCld:            existingReport.cld,
          totalCake:           existingReport.cake,
          totalExpense:        existingReport.expense,
          totalCashDeposit:    existingReport.cashDeposit,
          totalPettyCash:      existingReport.pettyCash,
          totalMonthRevenue:   existingReport.totalRevenue,
          totalUpiDeposit:     existingReport.upiDeposit,
          totalCashReceived:   existingReport.cashReceived,
          totalAdult:          existingReport.totalAdultPax,
          totalChild:          existingReport.totalChildPax,
          avgRoomPerDay: existingReport.roomSold / newDaysCount,
          avgOccupancy: (existingReport.roomSold * 100) / (totalAvailableRooms * newDaysCount),
          arr: existingReport.roomSold > 0 ? existingReport.roomRevenue / existingReport.roomSold : 0,
          revPerRoom: existingReport.roomRevenue / (totalAvailableRooms * newDaysCount),
        });
        await newMonthlySummary.save();
      }
    }

    res.status(200).json({
      message: "Daily report and monthly summary updated successfully.",
    });

  } catch (error) {
    console.error("Error updating report:", error);
    res.status(500).json({
      error: "Internal Server Error",
      details: (error as Error).message,
    });
  }
});

// Apply diffs from updated report vs previous report
function applyDiffs(summary: any, updated: any, prev: any) {
  summary.totalRoomSold       += (updated.roomSold       || 0) - (prev.roomSold       || 0);
  summary.totalRoomRevenue    += (updated.roomRevenue    || 0) - (prev.roomRevenue    || 0);
  summary.totalRestaurantSale += (updated.restaurantSale || 0) - (prev.restaurantSale || 0);
  summary.totalMealPlanSale   += (updated.mealPlanSale   || 0) - (prev.mealPlanSale   || 0);
  summary.totalBarSale        += (updated.barSale        || 0) - (prev.barSale        || 0);
  summary.totalSpa            += (updated.spaSale        || 0) - (prev.spaSale        || 0);
  summary.totalCld            += (updated.cld            || 0) - (prev.cld            || 0);
  summary.totalCake           += (updated.cake           || 0) - (prev.cake           || 0);
  summary.totalExpense        += (updated.expense        || 0) - (prev.expense        || 0);
  summary.totalCashDeposit    += (updated.cashDeposit    || 0) - (prev.cashDeposit    || 0);
  summary.totalPettyCash      += (updated.pettyCash      || 0) - (prev.pettyCash      || 0);
  summary.totalMonthRevenue   += (updated.totalRevenue   || 0) - (prev.totalRevenue   || 0);
  summary.totalUpiDeposit     += (updated.upiDeposit     || 0) - (prev.upiDeposit     || 0);
  summary.totalCashReceived   += (updated.cashReceived   || 0) - (prev.cashReceived   || 0);
  summary.totalAdult          += (updated.totalAdultPax  || 0) - (prev.totalAdultPax  || 0);
  summary.totalChild          += (updated.totalChildPax  || 0) - (prev.totalChildPax  || 0);
}

// Subtract an entire report from a summary (when moving OUT of a month)
function subtractReport(summary: any, report: any) {
  summary.totalRoomSold       -= (report.roomSold       || 0);
  summary.totalRoomRevenue    -= (report.roomRevenue    || 0);
  summary.totalRestaurantSale -= (report.restaurantSale || 0);
  summary.totalMealPlanSale   -= (report.mealPlanSale   || 0);
  summary.totalBarSale        -= (report.barSale        || 0);
  summary.totalSpa            -= (report.spaSale        || 0);
  summary.totalCld            -= (report.cld            || 0);
  summary.totalCake           -= (report.cake           || 0);
  summary.totalExpense        -= (report.expense        || 0);
  summary.totalCashDeposit    -= (report.cashDeposit    || 0);
  summary.totalPettyCash      -= (report.pettyCash      || 0);
  summary.totalMonthRevenue   -= (report.totalRevenue   || 0);
  summary.totalUpiDeposit     -= (report.upiDeposit     || 0);
  summary.totalCashReceived   -= (report.cashReceived   || 0);
  summary.totalAdult          -= (report.totalAdultPax  || 0);
  summary.totalChild          -= (report.totalChildPax  || 0);
}

// Add an entire report to a summary (when moving INTO a month)
function addReport(summary: any, report: any) {
  summary.totalRoomSold       += (report.roomSold       || 0);
  summary.totalRoomRevenue    += (report.roomRevenue    || 0);
  summary.totalRestaurantSale += (report.restaurantSale || 0);
  summary.totalMealPlanSale   += (report.mealPlanSale   || 0);
  summary.totalBarSale        += (report.barSale        || 0);
  summary.totalSpa            += (report.spaSale        || 0);
  summary.totalCld            += (report.cld            || 0);
  summary.totalCake           += (report.cake           || 0);
  summary.totalExpense        += (report.expense        || 0);
  summary.totalCashDeposit    += (report.cashDeposit    || 0);
  summary.totalPettyCash      += (report.pettyCash      || 0);
  summary.totalMonthRevenue   += (report.totalRevenue   || 0);
  summary.totalUpiDeposit     += (report.upiDeposit     || 0);
  summary.totalCashReceived   += (report.cashReceived   || 0);
  summary.totalAdult          += (report.totalAdultPax  || 0);
  summary.totalChild          += (report.totalChildPax  || 0);
}

// Recalculate averages/ratios
function recalculateAverages(summary: any, totalRooms: number, daysCount: number) {
  summary.avgRoomPerDay = summary.totalRoomSold / daysCount;
  summary.avgOccupancy  = (summary.totalRoomSold * 100) / (totalRooms * daysCount);
  summary.arr           = summary.totalRoomSold > 0
    ? summary.totalRoomRevenue / summary.totalRoomSold : 0;
  summary.revPerRoom    = summary.totalRoomRevenue / (totalRooms * daysCount);
}

export default router;
