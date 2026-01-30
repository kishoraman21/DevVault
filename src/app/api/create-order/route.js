export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { connect } from "@/db/connectDB";
import Product from "@/models/product";
import Order from "@/models/order";

export async function POST(req) {
  try {
    await connect();

    const Razorpay = (await import("razorpay")).default;

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const { productId, userEmail } = await req.json();

    const product = await Product.findById(productId);

    if (!product) {
      return NextResponse.json(
        { message: "Product not found" },
        { status: 404 }
      );
    }

    const isFree = product.price === "FREE";

    let razorpayOrder = null;

    if (!isFree) {
      razorpayOrder = await razorpay.orders.create({
        amount: product.price * 100,
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
      });
    }

    const order = await Order.create({
      product: productId,
      email: userEmail,
      amount: product.price,
      razorpayOrderId: isFree ? "FREE" : razorpayOrder.id,
      status: "pending",
    });

    return NextResponse.json({
      success: true,
      isFree,
      orderId: isFree ? null : razorpayOrder.id,
      dbOrderId: order._id,
      amount: isFree ? 0 : razorpayOrder.amount,
      currency: "INR",
      userEmail,
    });

  } catch (err) {
    console.error("Order error:", err);
    return NextResponse.json(
      { message: "Order creation failed" },
      { status: 500 }
    );
  }
}
