import { validateProperty } from "../services/service.js";

export async function CheckPropertyId(req, res) {
  try {
    const { propertyId } = req.body;
    const data = await validateProperty(propertyId);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    
    res.status(500).json({
 
      success: false,
       
      message: error.message,
        
    });
  }
}
