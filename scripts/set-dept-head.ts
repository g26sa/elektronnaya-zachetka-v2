import { PrismaClient } from "@prisma/client";

(async () => {
  const p = new PrismaClient();
  const inst = await p.institution.findFirst();
  if (inst) {
    const updated = await p.institution.update({
      where: { id: inst.id },
      data: {
        departmentName: inst.departmentName ?? "Отделение информационных технологий",
        departmentHeadTitle: inst.departmentHeadTitle ?? "Заведующий отделением",
        departmentHeadName: inst.departmentHeadName ?? "Иванова Ирина Игоревна",
      },
    });
    console.log("Institution updated:", {
      departmentName: updated.departmentName,
      departmentHeadTitle: updated.departmentHeadTitle,
      departmentHeadName: updated.departmentHeadName,
    });
  } else {
    console.log("No Institution row in DB");
  }
  await p.$disconnect();
})();
