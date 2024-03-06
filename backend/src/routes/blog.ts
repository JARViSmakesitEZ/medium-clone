import { Hono } from "hono";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { verify } from "hono/jwt";
import {
  CreateBlogInput,
  createBlogInput,
  updateBlogInput,
} from "@jarvis787/medium-common";

//the c is called a context for a reason , as it brings with it everything related to that request like request headers,body,how to send back headers to the user,how to send back body to the users etc.
//u can use this variable as a store and put more things into this context variable using set()/get()

export const blogRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  };
  Variables: {
    userID: string;
  };
}>();

//MIDDLEWARE
blogRouter.use("/*", async (c, next) => {
  //jobs of this middleware
  //get the header, verify the Header, if the header is correct then we can proceed else return 403 status code

  const authHeader = c.req.header("authorization") || "";
  //whenever the user is sending you the request in postman, if you expect them to send their authorization header as "Bearer token" then do the below, else header itself will be the token if they simply give you the header
  //normally we expect them to give in the Bearer token format
  //Bearer token => ["Bearer","token"]
  const token = authHeader.split(" ")[1];
  const response = await verify(token, c.env.JWT_SECRET);
  if (response.id) {
    c.set("userID", response.id);
    await next();
  } else {
    c.status(403);
    return c.json({ error: "Unauthorized" });
  }
});

blogRouter.post("/", async (c: any) => {
  try {
    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());

    const body = await c.req.json();
    const { success } = createBlogInput.safeParse(body);
    if (!success) {
      c.json(411);
      return c.json({ message: "inputs are incorrect" });
    }
    const authorId = c.get("userID");

    const blog = await prisma.blog.create({
      data: {
        title: body.title,
        content: body.content,
        authorId: authorId,
      },
    });

    return c.json({ id: blog.id });
  } catch (e) {
    console.error("Error while fetching the blogs:", e);
    c.status(403);
    return c.json({ message: "Error while fetching the blogs:" });
  }
});

//hit it in postman like this: http://localhost:8787/api/v1/blog/80db3650-f9f9-4d6c-93a2-d6cdb01469c7
blogRouter.put("/:id", async (c: any) => {
  try {
    console.log("hi there");
    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());

    const body = await c.req.json();
    console.log(body);
    const { success } = createBlogInput.safeParse(body);
    if (!success) {
      c.json(411);
      return c.json({ message: "incorrect input" });
    }

    const id = c.req.param("id");

    const blog = await prisma.blog.update({
      where: {
        id: id,
      },
      data: { title: body.title, content: body.content },
    });

    return c.json({ blog: blog });
  } catch (e) {
    console.error("Error while updating the blog:", e);
    c.status(411);
    return c.json({ message: "Error while updating the blog" });
  }
});

//here usually u should add what's called "pagination" to this endpoint,which means u shouldn't return all the blogs, u should return the first 10 blogs to the user,and the user can ask for more as they scroll down on the window.
blogRouter.get("/bulk", async (c: any) => {
  try {
    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());

    const blogs = await prisma.blog.findMany();
    console.log(blogs);

    return c.json({ blogs: blogs });
  } catch (e) {
    console.error("Error while getting the blog:", e);
    c.status(403);
    return c.json({ message: "Error while getting the blog" });
  }
});

blogRouter.get("/:id", async (c: any) => {
  try {
    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());

    const id = c.req.param("id");

    const blog = await prisma.blog.findFirst({
      where: {
        id: id,
      },
    });

    return c.json({ blog: blog });
  } catch (e) {
    console.error("Error while getting the blog:", e);
    c.status(403);
    return c.json({ message: "Error while getting the blog" });
  }
});
