const express = require("express");
const { DataBaseconnection } = require("./Database/DBconnection");
const errorMiddliware = require("./Middliware/errorMiddileware");  
const ErrorHandler = require("./special/errorHandelar")
const cookieParser = require("cookie-parser");
const fileUpload = require("express-fileupload");
const bodyParser = require("body-parser");
const sub_server = express();
const cloudinary = require("cloudinary");
var cors = require("cors");
const morgan = require("morgan");



//! middileware for json,file,cookies,body parsing
sub_server.use(express.json());
sub_server.use(cookieParser());
sub_server.use(bodyParser.urlencoded({ extended: true }));
sub_server.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/", //! souravnote: The /tmp/ directory is a special directory on Unix-like operating systems (such as Linux and macOS) that is used to store temporary files. This directory usually already exists and is managed by the operating system. Applications are generally permitted to create temporary files within this directory without needing to create it themselves.
  })
);
//! cors policy
 const corsOptions = {
  origin: "*",
   methods: "GET, POST, PUT, DELETE, PATCH, HEAD",
   credentials: false,
};
 sub_server.use(cors(corsOptions));


sub_server.set("trust proxy",true)
//! Morgan for logging
sub_server.use(
  morgan(
    ":method :url :status :res[content-length] - :response-time ms  Client-Ip: :remote-addr "
  )
);

//! database connect come on sourav
//! Use database connection middleware
const StartDatabase = async () => {
  try {
    await DataBaseconnection();
  } catch (error) {
    support_server.use((req, res, next) => {
      next(error);
    });
  } }
  StartDatabase();
//! studymaterial,facultypic,videos upload on cloudinary


//! routes path home
sub_server.get("/", (req, res) => {
  res.send("Server is Up and Running");
});

//! Import all routes
const authRoute = require("./Routes/authRoute");
const userRoute = require("./Routes/userRoute");
const orderRoute = require("./Routes/orderRoute");
const planRoute = require("./Routes/planRoute");
const demoContentRoute = require("./Routes/demoContentRoute");
const teamRoute = require("./Routes/teamRoute");
const adminRoute = require("./Routes/adminRoute");
const uploadRoute = require("./Routes/uploadRoute");
const meetingRoute = require("./Routes/meetingRoute");
const meetingRequestRoute = require("./Routes/meetingRequestRoute");
const portfolioRoute = require("./Routes/portfolioRoute");

//! Register routes
sub_server.use("/api/auth", authRoute);
sub_server.use("/api/users", userRoute);
sub_server.use("/api/orders", orderRoute);
sub_server.use("/api/plans", planRoute);
sub_server.use("/api/demo-content", demoContentRoute);
sub_server.use("/api/team", teamRoute);
sub_server.use("/api/admin", adminRoute);
sub_server.use("/api/upload", uploadRoute);
sub_server.use("/api/meetings", meetingRoute);
sub_server.use("/api/meeting-requests", meetingRequestRoute);
sub_server.use("/api/portfolio", portfolioRoute);

//! error middileware (must be last)
sub_server.use(errorMiddliware);



module.exports = { sub_server };