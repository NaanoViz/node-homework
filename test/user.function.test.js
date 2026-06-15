require("dotenv").config();
const request = require("supertest");
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

const prisma = require("../db/prisma");

let agent;
let saveRes;
let logonRes;
let csrfToken;
let tasksRes;

const { app, server } = require("../app");

beforeAll(async () => {
  // clear database
  await prisma.Task.deleteMany(); // delete all tasks
  await prisma.User.deleteMany(); // delete all users 
  agent = request.agent(app);
});

afterAll(async () => {
  prisma.$disconnect();
  server.close();
});

describe("register a user ", () => {
  let saveRes = null; // we'll declare this out here, so that we can reference it in several tests
  it("46. it creates the user entry", async () => {
    const newUser = {
      name: "John Deere",
      email: "jdeere@example.com",
      password: "Pa$$word20",
    };
    saveRes = await agent.post("/api/users/register").send(newUser);
    expect(saveRes.status).toBe(201);
  });

  it("47. Registration returns an object with the expected name.", () => {
    const userName = saveRes.body.user ? saveRes.body.user.name : saveRes.body.name;
    expect(userName).toBe("John Deere");
  });

  it("48. Test that the returned object includes a csrfToken.", () => {
    expect(saveRes.body.csrfToken).toBeDefined();
  });

  it("49. You can logon as the newly registered user.", async () => {
    const loginCredentials = {
      email: "jdeere@example.com",
      password: "Pa$$word20",
    };
    logonRes = await agent.post("/api/users/logon").send(loginCredentials);
    
    csrfToken = logonRes.body.csrfToken;
    expect(logonRes.status).toBe(200);
  });

  it("50. Verify that you are logged in: /api/tasks should not return a 401", async () => {
    tasksRes = await agent.get("/api/tasks");
    expect(tasksRes.status).not.toBe(401);
  });

  it("51. Verify that you can log out.", async () => {
    logoffRes = await agent
      .post("/api/users/logoff")
      .set("X-CSRF-TOKEN", csrfToken)
      .send({});
    expect(logoffRes.status).toBe(200);
  });

  it("52. Make sure that you are really logged out: /api/tasks should now return a 401", async () => {
    const secureCheckRes = await agent.get("/api/tasks");
    expect(secureCheckRes.status).toBe(401);
  });

}); 

