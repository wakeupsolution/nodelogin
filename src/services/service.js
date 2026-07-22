import {checkProperty } from "../model/login.js";


export async function validateProperty(propertyId) {
    const property = await checkProperty(propertyId);

    if (!property.cmpid) {
        throw new Error("Property not found");
    }

    if (property.activest !== 1) {
        throw new Error("Property is inactive");
    }

    return property;
}