import { startServer } from "./server.mjs";
import { sql } from "./db.mjs";

const TEST_PORT = 3333;
const BASE_URL = `http://localhost:${TEST_PORT}`;

async function run() {
  console.log("=== Starting End-to-End Test for Neon Services ===");

  const server = await startServer(TEST_PORT);
  console.log(`Test server running on port ${TEST_PORT}`);

  try {
    // 1. Test /api/status
    console.log("\n1. Testing GET /api/status...");
    const statusRes = await fetch(`${BASE_URL}/api/status`);
    const statusData = await statusRes.json();
    console.log("Status response:", statusData);
    if (!statusData.ok || statusData.mode !== "neon") {
      throw new Error("Invalid status response from Neon server");
    }

    // 2. Test saving a month document
    console.log("\n2. Testing POST /api/months/2569-10...");
    const testMonthDoc = {
      v: { r1: 705250, r4: 580660, e1: 24400, e2: 1375, e4: 384050, e7: 80000, e9: 423150, e14: 19240, e15: 5460, e16: 4500 },
      x: { r1: "705250" },
      status: "draft",
      updatedAt: new Date().toISOString(),
      updatedBy: "admin"
    };
    const monthRes = await fetch(`${BASE_URL}/api/months/2569-10`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testMonthDoc)
    });
    const monthData = await monthRes.json();
    console.log("Month save response:", monthData);
    if (!monthData.ok) throw new Error("Failed to save month document");

    // 3. Test saving admin inventory
    console.log("\n3. Testing POST /api/admin...");
    const testAdminDoc = {
      carry: 100000,
      cogs: { "2569-10": 395334.40 },
      updatedAt: new Date().toISOString(),
      updatedBy: "admin"
    };
    const adminRes = await fetch(`${BASE_URL}/api/admin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testAdminDoc)
    });
    const adminData = await adminRes.json();
    console.log("Admin save response:", adminData);
    if (!adminData.ok) throw new Error("Failed to save admin document");

    // 4. Test saving a user
    console.log("\n4. Testing POST /api/users/teststaff...");
    const testUserDoc = {
      name: "สมศรี ทดสอบ",
      role: "staff",
      active: true,
      salt: "abcdef1234567890",
      hash: "1234567890abcdef",
      iter: 100000,
      createdAt: new Date().toISOString(),
      createdBy: "admin"
    };
    const userRes = await fetch(`${BASE_URL}/api/users/teststaff`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testUserDoc)
    });
    const userData = await userRes.json();
    console.log("User save response:", userData);
    if (!userData.ok) throw new Error("Failed to save user document");

    // 5. Test logging an audit event
    console.log("\n5. Testing POST /api/audit...");
    const testAuditDoc = {
      id: "test-audit-" + Date.now(),
      at: new Date().toISOString(),
      by: "admin",
      byName: "Admin",
      action: "E2E Test Action",
      month: "2569-10",
      changes: [{ f: "r1", label: "นวด", from: 0, to: 705250 }]
    };
    const auditRes = await fetch(`${BASE_URL}/api/audit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testAuditDoc)
    });
    const auditData = await auditRes.json();
    console.log("Audit log response:", auditData);
    if (!auditData.ok) throw new Error("Failed to log audit document");

    // 6. Test GET /api/data (retrieving all data from Neon)
    console.log("\n6. Testing GET /api/data...");
    const dataRes = await fetch(`${BASE_URL}/api/data`);
    const allData = await dataRes.json();
    console.log("Retrieved data keys:", Object.keys(allData));
    console.log("Month 2569-10 present:", !!allData.months["2569-10"]);
    console.log("Admin carry:", allData.admin.carry);
    console.log("User teststaff present:", !!allData.users["teststaff"]);
    console.log("Audit count:", allData.audit.length);

    if (!allData.months["2569-10"] || allData.admin.carry !== 100000 || !allData.users["teststaff"]) {
      throw new Error("Data retrieved from Neon does not match written data");
    }

    // 7. Test DELETE /api/users/teststaff
    console.log("\n7. Testing DELETE /api/users/teststaff...");
    const deleteRes = await fetch(`${BASE_URL}/api/users/teststaff`, { method: "DELETE" });
    const deleteData = await deleteRes.json();
    console.log("Delete user response:", deleteData);
    if (!deleteData.ok) throw new Error("Failed to delete user document");

    // Clean up test audit and month if needed, or leave month as sample
    console.log("\n=== ALL END-TO-END TESTS PASSED SUCCESSFULLY! ===");
  } finally {
    server.close();
  }
}

run().catch(err => {
  console.error("End-to-End Test failed:", err);
  process.exit(1);
});
