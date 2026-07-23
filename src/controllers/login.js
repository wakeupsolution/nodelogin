import crypto from "crypto";
import { cloudModel } from "../model/login.js";

export const checkUserLogin = async (req, res) => {
  try {
    const {
      accesstoken,
      guid,
      propId,
      userId,
      secId,
    } = req.body;

    let checkIp = 1;

    // Property Check
    const property = await cloudModel.checkPropertyId(propId);

    if (!property.cmpid) {
      return res.json({
        sky: {
          status: "Failed",
          error: "Incorrect PropertyId",
        },
      });
    }

    if (property.activest != 1) {
      return res.json({
        sky: {
          status: "Failed",
          error: "Your Property is In-Active , Contact Your Software Vendor.",
        },
      });
    }

    const result = await cloudModel.checkUserId(
      propId,
      userId,
      secId,
      property.cmpid
    );

    if (result == 0) {
      return res.json({
        sky: {
          status: "Failed",
          error: "Your Login is In-Active",
        },
      });
    }

    if (result == -1) {
      return res.json({
        sky: {
          status: "Failed",
          error: "Your Login is In-Active, Since not logged in the recent times",
        },
      });
    }

    if (result == -2) {
      return res.json({
        sky: {
          status: "Failed",
          error: "Incorrect UserId",
        },
      });
    }

    const model = await cloudModel.checkUserLogin(
      propId,
      userId,
      secId
    );

    if (!model.length) {
      return res.json({
        sky: {
          status: "Failed",
          error: "Incorrect Password",
        },
      });
    }

    const user = model[0];

    let twofactor = 0;

    if (
      (user.enabletwofactor == 1 && user.proptwofactor == 0) ||
      (user.enabletwofactor == 1 && user.proptwofactor == 1)
    ) {
      twofactor = 1;
    }

    // if (user.restricttoip == 1) {
    //   checkIp = await cloudModel.checkIp(user.userid, req.ip);
    // }

    // if (checkIp == 0) {
    //   return res.json({
    //     sky: {
    //       status: "Failed",
    //       error: "This User not allowed to login for this location",
    //     },
    //   });
    // }

    if (twofactor == 1) {
      if (!accesstoken) {
        return res.json({
          sky: {
            valid: "newuser",
          },
        });
      }

      const decipher = crypto.createDecipheriv(
        "aes-256-ecb",
        Buffer.from(propId),
        null
      );

      decipher.setAutoPadding(true);

      let decrypted =
        decipher.update(accesstoken, "base64", "utf8") +
        decipher.final("utf8");

      if (guid !== decrypted) {
        return res.json({
          sky: {
            valid: "invaliduser",
          },
        });
      }
    }

    const session = await setSession(user);

    return res.json(session);

  } catch (err) {
    console.log(err);

    return res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
};