import { getAdminServices } from "@/lib/firebase/admin";
import { createCourseRazorpayOrder } from "@/features/payments/payment.service";
export const runtime="nodejs";
export async function POST(request){try{const value=request.headers.get("authorization")||"";const token=value.startsWith("Bearer ")?value.slice(7):null;if(!token)return Response.json({error:"Authentication required."},{status:401});const {adminAuth}=getAdminServices();const user=await adminAuth.verifyIdToken(token);return Response.json(await createCourseRazorpayOrder(user.uid,(await request.json()).courseId));}catch(error){return Response.json({error:error.message||"Unable to start course payment."},{status:error.status||500});}}
