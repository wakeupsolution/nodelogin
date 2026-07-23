// models/cloudModel.js

import { wsmaster } from "../config/database.js";

export const cloudModel = {
  // ---------------------------------------------
  // CHECK PROPERTY
  // ---------------------------------------------
  async checkPropertyId(propertyId) {
    const sql = `
      SELECT COUNT(propid) count, cmpid, activest
      FROM property_master
      WHERE propertyid = ?
    `;

    const [rows] = await wsmaster.execute(sql, [propertyId]);

    if (rows[0].count > 0) {
      return {
        cmpid: rows[0].cmpid,
        activest: rows[0].activest,
      };
    }

    const sql2 = `
      SELECT COUNT(cmpid) count, cmpid
      FROM company_master
      WHERE accountid = ?
    `;

    const [rows2] = await wsmaster.execute(sql2, [propertyId]);

    if (rows2[0].count > 0) {
      return {
        cmpid: rows2[0].cmpid,
        activest: 1,
      };
    }

    return {
      cmpid: 0,
      activest: 0,
    };
  },

  // ---------------------------------------------
  // CHECK USER STATUS
  // ---------------------------------------------
  async checkUserId(propertyId, userId, password, cmpid) {
    const sql = `
        SELECT
            um.userid,
            um.username,
            um.autodeactivate,
            um.lastlogindate,
            CASE
                WHEN company_master.userinactafter <
                     ABS(TIMESTAMPDIFF(DAY,NOW(),um.lastlogindate))
                THEN 0
                ELSE 1
            END usractive
        FROM user_master um
        LEFT JOIN company_master
             ON company_master.cmpid=um.cmpid
        WHERE userloginid=?
        AND um.userpwd=?
        AND um.status!='0'
        AND um.cmpid=?
    `;
    console.log(sql);
    const [activeRows] = await wsmaster.execute(sql, [userId, password, cmpid]);

    if (activeRows.length) {
      if (activeRows[0].usractive == 0 && activeRows[0].autodeactivate != 0) {
        await wsmaster.execute(
          `
          UPDATE user_master
          SET status='-1'
          WHERE userloginid=?
          AND userpwd=?
          AND cmpid=(
            SELECT cmpid
            FROM property_master
            WHERE propertyid=?
          )
        `,
          [userId, password, propertyId],
        );

        return -1;
      }
    }

    let count = 0;
    let status = 0;

    const [rows] = await wsmaster.execute(
      `
      SELECT
        COUNT(user_master.userid) count,
        COALESCE(user_master.status,0) userstatus
      FROM property_master
      INNER JOIN user_property_list_secgrp ups
      ON ups.propid=property_master.propid
      INNER JOIN user_master
      ON user_master.userid=ups.userid
      WHERE propertyid=?
      AND userloginid=?
    `,
      [propertyId, userId],
    );

    if (rows[0].count > 0) {
      count = rows[0].count;
      status = rows[0].userstatus;
    } else {
      const [rows2] = await wsmaster.execute(
        `
        SELECT
          COUNT(um.userid) count,
          COALESCE(um.status,0) userstatus
        FROM company_master cm
        INNER JOIN user_property_list_secgrp ups
        ON ups.cmpid=cm.cmpid
        INNER JOIN user_master um
        ON um.userid=ups.userid
        WHERE accountid=?
        AND userloginid=?
      `,
        [propertyId, userId],
      );

      if (rows2.length) {
        count = rows2[0].count;
        status = rows2[0].userstatus;
      }
    }

    if (count > 0 && status == 1) return 1;

    if (count == 0) return -2;

    if (status == 0) return 0;

    return status;
  },

  // ---------------------------------------------
  // LOGIN CHECK
  // ---------------------------------------------
  async checkUserLogin(propertyId, userId, password) {
    let sql = `
      SELECT
          pm.propertyid,
          um.userloginid,
          um.userpwd,
          um.username,
          pm.propid,
          pm.propname,
          pm.cmpid,
          pm.cloudappserveraccessmode accessMode,
          pm.cloudappserverid appServerId,
          pm.enbalettwofactor proptwofactor,
          um.userid,
          um.restricttoip,
          um.enabletwofactor,
          pm.databasename dbname,
          ug.trnid grpid,
          ug.groupname,
          ug.module,
          ug.grouptype,
          db.dbserverip dbserver,
          db.dbserveruserid dbuserid,
          db.dbserverpwd dbpwd
      FROM user_master um
      INNER JOIN user_property_list_secgrp ups
          ON ups.userid=um.userid
      INNER JOIN user_group_master_cmp ug
          ON ug.trnid=ups.usersecuritygrpid
      INNER JOIN property_master pm
          ON pm.propid=ups.propid
      INNER JOIN property_module_list pml
          ON pml.cmpid=ups.cmpid
          AND pml.propid=ups.propid
          AND pml.modid=ug.module
      INNER JOIN cloud_dbserver_master db
          ON db.clouddbid=pm.clouddbserverid
      WHERE
          um.userloginid=?
      AND um.userpwd=?
      AND pm.propertyid=?
      AND um.status=1
      GROUP BY um.userid,pm.propid,ug.trnid
    `;

    let [rows] = await wsmaster.execute(sql, [userId, password, propertyId]);

    if (!rows.length) {
      sql = `
      SELECT
          cm.accountid propertyid,
          um.userloginid,
          um.userpwd,
          um.username,
          cm.cmpid,
          0 propid,
          cm.cmpname propname,
          cm.enbalettwofactor proptwofactor,
          cm.cloudappserveraccessmode accessMode,
          cm.cloudappserverid appServerId,
          um.userid,
          um.restricttoip,
          um.enabletwofactor,
          cm.databasename dbname,
          ug.trnid grpid,
          ug.groupname,
          ug.module,
          ug.grouptype,
          db.dbserverip dbserver,
          db.dbserveruserid dbuserid,
          db.dbserverpwd dbpwd
      FROM user_master um
      INNER JOIN user_property_list_secgrp ups
          ON ups.userid=um.userid
      INNER JOIN user_group_master_cmp ug
          ON ug.trnid=ups.usersecuritygrpid
      INNER JOIN company_master cm
          ON cm.cmpid=ups.cmpid
      INNER JOIN property_module_list pml
          ON pml.cmpid=ups.cmpid
          AND pml.modid=ug.module
      INNER JOIN cloud_dbserver_master db
          ON db.clouddbid=cm.clouddbserverid
      WHERE
          um.userloginid=?
      AND um.userpwd=?
      AND cm.accountid=?
      AND um.status=1
      GROUP BY um.userid,cm.cmpid,ug.trnid
      `;

      [rows] = await wsmaster.execute(sql, [userId, password, propertyId]);
    }

    if (rows.length) {
      await wsmaster.execute(
        `
        UPDATE user_master
        SET lastlogindate=NOW()
        WHERE userloginid=?
        AND userpwd=?
      `,
        [userId, password],
      );
    }

    return rows;
  },

  // ---------------------------------------------
  // CHECK IP
  // ---------------------------------------------
  // async checkIp(userid, ip) {
  //   const sql = `
  //     SELECT ipaddr
  //     FROM iplocation
  //     INNER JOIN user_restrictip
  //     ON user_restrictip.iptrnid=iplocation.iptrnid
  //     WHERE userid=?
  //     AND ? IN(ipaddr)
  //   `;

  //   const [rows] = await wsmaster.execute(sql, [userid, ip]);

  //   return rows.length ? 1 : 0;
  // },
};
