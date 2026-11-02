import { startServer } from "./server.mjs";
import { sql } from "./db.mjs";

const TEST_PORT = 3333;
const BASE_URL = `http://localhost:${TEST_PORT}`;

async function run() {
  console.log("=== Starting End-to-End Test for Neon Services ===");

  const server = await startServer(TEST_PORT);
  console.log(`Test server running on port ${TEST_PORT}`);

  let origAdmin = null;

  try {
    // 0. Backup original admin inventory
    const initDataRes = await fetch(`${BASE_URL}/api/data`);
    if (initDataRes.ok) {
      const initData = await initDataRes.json();
      origAdmin = initData.admin || { carry: null, cogs: {} };
    }

    // 1. Test /api/status
    console.log("\n1. Testing GET /api/status...");
    const statusRes = await fetch(`${BASE_URL}/api/status`);
    const statusData = await statusRes.json();
    console.log("Status response:", statusData);
    if (!statusData.ok || statusData.mode !== "neon") {
      throw new Error("Invalid status response from Neon server");
    }

    // 2. Test saving a test month document (isolated key)
    const TEST_MONTH = "test-e2e-month";
    console.log(`\n2. Testing POST /api/months/${TEST_MONTH}...`);
    const testMonthDoc = {
      v: { r1: 1000 },
      x: { r1: "1000" },
      status: "draft",
      updatedAt: new Date().toISOString(),
      updatedBy: "admin"
    };
    const monthRes = await fetch(`${BASE_URL}/api/months/${TEST_MONTH}`, {
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
      carry: 999999,
      cogs: { [TEST_MONTH]: 500 },
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
    const testAuditId = "test-audit-" + Date.now();
    console.log("\n5. Testing POST /api/audit...");
    const testAuditDoc = {
      id: testAuditId,
      at: new Date().toISOString(),
      by: "admin",
      byName: "Admin",
      action: "E2E Test Action",
      month: "",
      changes: []
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
    console.log(`Month ${TEST_MONTH} present:`, !!allData.months[TEST_MONTH]);
    console.log("Admin carry:", allData.admin.carry);
    console.log("User teststaff present:", !!allData.users["teststaff"]);

    if (!allData.months[TEST_MONTH] || allData.admin.carry !== 999999 || !allData.users["teststaff"]) {
      throw new Error("Data retrieved from Neon does not match written data");
    }

    // 7. Cleanup only test records without affecting real data
    console.log("\n7. Cleaning up test records (non-destructive)...");
    await fetch(`${BASE_URL}/api/users/teststaff`, { method: "DELETE" });
    if (sql) {
      await sql`DELETE FROM months WHERE key = ${TEST_MONTH};`;
      await sql`DELETE FROM audit WHERE id = ${testAuditId};`;
      if (origAdmin) {
        await sql`
          INSERT INTO inventory (id, doc, updated_at)
          VALUES ('default', ${JSON.stringify(origAdmin)}, NOW())
          ON CONFLICT (id) DO UPDATE SET doc = EXCLUDED.doc, updated_at = NOW();
        `;
      }
    }
    console.log("✔ Test artifacts cleaned up. Real user data preserved.");

    console.log("\n=== ALL END-TO-END TESTS PASSED SUCCESSFULLY! ===");
  } finally {
    server.close();
  }
}

run().catch(err => {
  console.error("End-to-End Test failed:", err);
  process.exit(1);
});
