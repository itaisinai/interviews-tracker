import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const suspectedMessageIds = [
  "19f59e332811e1d1",
  "19f46a252dbe424d",
  "19f45af98eccae3d",
  "19f45892362a9045",
  "19f41f0549402b8a",
];

async function main() {
  console.log("🔍 Finding suppressed Traild messages...\n");

  const messages = await prisma.gmailMessageState.findMany({
    where: {
      auth0Email: "itai.sinai@gmail.com",
      messageId: { in: suspectedMessageIds },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (messages.length === 0) {
    console.log("❌ No messages found!");
    return;
  }

  console.log(`Found ${messages.length} suppressed messages:\n`);

  messages.forEach((msg, index) => {
    console.log(`${index + 1}. ${msg.messageId}`);
    console.log(`   Status: ${msg.status}`);
    console.log(`   Subject: ${msg.subject || "(no subject)"}`);
    console.log(`   From: ${msg.from || "(no from)"}`);
    console.log(`   Updated: ${msg.updatedAt}`);
    console.log("");
  });

  // Find the original Traild message (not a "Re:")
  const originalTraild = messages.find(
    (msg) => msg.subject?.includes("Traild") && msg.subject?.includes("Founding") && !msg.subject?.startsWith("Re:")
  );

  if (originalTraild) {
    console.log("🎯 Found the original Traild message!");
    console.log(`   MessageId: ${originalTraild.messageId}`);
    console.log(`   Subject: ${originalTraild.subject}`);
    console.log(`   Status: ${originalTraild.status}`);
    console.log("");

    // Delete it
    console.log("🗑️  Deleting the suppression...");
    await prisma.gmailMessageState.delete({
      where: { messageId: originalTraild.messageId },
    });

    console.log("✅ Done! The message should now appear in your Gmail search.");
  } else {
    console.log("⚠️  Could not automatically identify the original Traild message.");
    console.log("You may need to manually delete one of the above messages.");
  }
}

main()
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
