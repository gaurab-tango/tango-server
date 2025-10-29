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
const formattedDate = `${DATE.getUTCDate()} ${DATE.toLocaleString("default", 
  { month: "long", timeZone: "UTC" })
  .toUpperCase()} ${DATE.getUTCFullYear()}`;

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

router.post("/daily-report", async (req, res): Promise<any> => {
  try {
    await dbConnect();

    const DATE = new Date();
    // const DATE = new Date(2025,9,23); // Fixed date for testing

    // Add 5 hours 30 minutes to get IST
    // const istOffsetMs = 5.5 * 60 * 60 * 1000; // 19800000 ms
    // const istDate = new Date(DATE.getTime() + istOffsetMs);
    const day = DATE.getUTCDate();           
    const month = DATE.getUTCMonth() + 1;    
    const year = DATE.getUTCFullYear();  
    
    // const day = DATE.getDate();
    // const month = DATE.getMonth() + 1;
    // const year = DATE.getFullYear();

    // Check if a report for today already exists
    const alreadyExists = await DailyReport.findOne({ day, month, year });

    if (alreadyExists) {
      return res.status(400).json({
        message: "Report for today has already been submitted.",
      });
    }

    const newEntry = new DailyReport({
      date: DATE,
      day,
      month,
      year,
      roomSold: req.body.roomSold,
      occupancyPercentage: req.body.occupancyPercentage,
      totalAdultPax: req.body.totalAdultPax,
      totalChildPax: req.body.totalChildPax,
      expectedArrival: req.body.expectedArrival,
      stayOver: req.body.stayOver,
      noShow: req.body.noShow,
      roomRevenue: req.body.roomRevenue,
      arr: req.body.arr,
      revPerRoom: req.body.revPerRoom,
      restaurantSale: req.body.restaurantSale,
      mealPlanSale: req.body.mealPlanSale,
      barSale: req.body.barSale,
      mealPlanPax: req.body.mealPlanPax,
      roomsUpgraded: req.body.roomsUpgraded,
      roomHalfDay: req.body.roomHalfDay,
      cld: req.body.cld,
      cake: req.body.cake,
      tableDecoration: req.body.tableDecoration,
      expense: req.body.expense,
      cashDeposit: req.body.cashDeposit,
      pettyCash: req.body.pettyCash,
      totalRevenue: req.body.totalRevenue,
      upiDeposit: req.body.upiDeposit,
      cashReceived: req.body.cashReceived,
      submittedBy: req.body.submittedBy,
    });
    await newEntry.save();

    const daily = req.body;
    const totalAvailableRooms = Number(process.env.TOTAL_ROOMS);

    const existingSummary = await MonthlySummary.findOne({ month, year });

    if (existingSummary) {
      const daysCount = await DailyReport.countDocuments({ month, year });

      const updatedRoomSold = existingSummary.totalRoomSold + daily.roomSold;
      const updatedRoomRevenue =
        existingSummary.totalRoomRevenue + daily.roomRevenue;

      existingSummary.totalRoomSold = updatedRoomSold;
      existingSummary.avgRoomPerDay = updatedRoomSold / daysCount;
      existingSummary.avgOccupancy =
        (updatedRoomSold * 100) / (totalAvailableRooms * daysCount);
      existingSummary.totalRoomRevenue = updatedRoomRevenue;
      existingSummary.arr = updatedRoomRevenue / updatedRoomSold;
      existingSummary.revPerRoom =
        updatedRoomRevenue / (totalAvailableRooms * daysCount);

      existingSummary.totalRestaurantSale += daily.restaurantSale;
      existingSummary.totalMealPlanSale += daily.mealPlanSale;
      existingSummary.totalBarSale += daily.barSale;
      existingSummary.totalCld += daily.cld;
      existingSummary.totalCake += daily.cake;
      existingSummary.totalExpense += daily.expense;
      existingSummary.totalCashDeposit += daily.cashDeposit;
      // ✅ Only add pettyCash if it's positive
      if (daily.pettyCash > 0) {
        existingSummary.totalPettyCash += daily.pettyCash;
      }
      existingSummary.totalUpiDeposit+=daily.upiDeposit;
      existingSummary.totalCashReceived+=daily.cashReceived;
      existingSummary.totalMonthRevenue += daily.totalRevenue;
      existingSummary.totalAdult+=daily.totalAdultPax;
      existingSummary.totalChild+=daily.totalChildPax;
      await existingSummary.save();
    } else {
      const initialDayCount = 1;

      const newSummary = new MonthlySummary({
        month,
        year,
        totalRoomSold: daily.roomSold,
        avgRoomPerDay: daily.roomSold / initialDayCount,
        avgOccupancy:
          (daily.roomSold * 100) / (totalAvailableRooms * initialDayCount),
        totalRoomRevenue: daily.roomRevenue,
        arr: daily.roomRevenue / daily.roomSold,
        revPerRoom: daily.roomRevenue / (totalAvailableRooms * initialDayCount),
        totalRestaurantSale: daily.restaurantSale,
        totalMealPlanSale: daily.mealPlanSale,
        totalBarSale: daily.barSale,
        totalCld: daily.cld,
        totalCake: daily.cake,
        totalExpense: daily.expense,
        totalCashDeposit: daily.cashDeposit,
        totalPettyCash: daily.pettyCash > 0 ? daily.pettyCash : 0,
        totalUpiDeposit: daily.upiDeposit,
        totalCashReceived: daily.cashReceived,
        totalMonthRevenue: daily.totalRevenue,
        totalAdult: daily.totalAdultPax,
        totalChild: daily.totalChildPax
      });

      await newSummary.save();
    }

    res.status(200).json({ message: "Data saved successfully!" });
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error",
      details: (error as Error).message,
    });
  }
});

export default router;
