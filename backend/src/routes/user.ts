import { Hono } from "hono";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { sign } from "hono/jwt";
import { signupInput, signinInput } from "@jarvis787/medium-common";

export const userRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  };
}>();

userRouter.post("/signup", async (c: any) => {
  try {
    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());

    const body = await c.req.json(); //sanatize this using zod(make sure it follows a certain format)
    const { success } = signupInput.safeParse(body);
    if (!success) {
      c.status(411);
      return c.json({ message: "inputs are incorrect" });
    }

    const user = await prisma.user.create({
      data: {
        email: body.email,
        password: body.password,
      },
    });

    const payload = { id: user.id };
    const secretKey = c.env.JWT_SECRET;

    const jwt = await sign(payload, secretKey);
    await prisma.$disconnect(); // Disconnect from the Prisma client after use
    return c.json({ jwt });
  } catch (e) {
    console.error("Error while signing up:", e);
    c.status(403);
    return c.json({ error: "Error while signing up" });
  }
});

userRouter.post("/signin", async (c: any) => {
  try {
    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
    });

    const body = await c.req.json();
    const { success } = signinInput.safeParse(body);
    if (!success) {
      c.status(411);
      return c.json({ message: "inputs are incorrect" });
    }
    const user = await prisma.user.findFirst({
      where: {
        email: body.email,
        password: body.password,
      },
    });

    if (user == null) {
      c.status(403); //status status code for unauthorized/wrong credentials
      return c.json("email or password incorrect");
    }
    // Successful signin
    const secretKey = c.env.JWT_SECRET;
    const payload = { id: user.id };

    const jwt = await sign(payload, secretKey);
    return c.json({ jwt: jwt });
  } catch (e) {
    console.error("Error while signing in:", e);
    c.status(403);
    return c.json({ error: "Error while signing in" });
  }
});
