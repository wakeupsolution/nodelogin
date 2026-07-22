import mysql from "mysql2";
import { wsmaster } from "../config/database.js";
export async function checkProperty(propertyId) {
  // Check in property_master
  const sql1 = `SELECT
            COUNT(propid) AS count,
            cmpid,
            activest
        FROM property_master
        WHERE propertyid = ?`;

  const params1 = [propertyId];
  const [propertyRows] = await wsmaster.execute(sql1, params1);
  const property = propertyRows[0];

  if (property && property.count > 0) {
    return {
      cmpid: property.cmpid,
      activest: property.activest,
    };
  }

  // Check in company_master

  const sql = `
    SELECT
        COUNT(cmpid) AS count,
        cmpid
    FROM company_master
    WHERE accountid = ?
`;

  const params = [propertyId];

  console.log(mysql.format(sql, params));

  const [companyRows] = await wsmaster.execute(sql, params);

  const company = companyRows[0];

  if (company && company.count > 0) {
    return {
      cmpid: company.cmpid,
      activest: 1,
    };
  }

  return {
    cmpid: null,
    activest: 0,
  };
}
