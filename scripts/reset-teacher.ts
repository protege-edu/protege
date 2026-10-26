/**
 * A teacher lost their password AND their recovery code. Run this on the laptop running Protégé:
 *   npm run reset-teacher -- their@email
 * It prints a new recovery code. They use it with "Forgot your password?" to pick a new password.
 */
import { resetFromLaptop } from "@/lib/teacher/auth";

const email = process.argv[2];
if (!email) {
  console.log("Which teacher? Run: npm run reset-teacher -- their@email");
  process.exitCode = 1;
} else {
  const code = resetFromLaptop(email);
  if (!code) {
    console.log(`No teacher account uses ${email}. Check the spelling.`);
    process.exitCode = 1;
  } else {
    console.log(`\nNew recovery code for ${email}:  ${code}\nOn the sign-in page, they press "Forgot your password?" and use it to pick a new password.\n`);
  }
}
