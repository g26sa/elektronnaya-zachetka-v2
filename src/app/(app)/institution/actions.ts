"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { z } from "zod";

const schema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  shortName: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  ogrn: z.string().optional().nullable(),
  inn: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  headName: z.string().optional().nullable(),
  headTitle: z.string().optional().nullable(),
  departmentHeadName: z.string().optional().nullable(),
  departmentHeadTitle: z.string().optional().nullable(),
  departmentName: z.string().optional().nullable(),
});

export async function saveInstitution(input: unknown) {
  const session = await getSession();
  assertCan(session, "institution:edit");
  const d = schema.parse(input);
  const before = await prisma.institution.findFirst();
  let result;
  const payload = {
    name: d.name,
    shortName: d.shortName ?? null,
    address: d.address ?? null,
    ogrn: d.ogrn ?? null,
    inn: d.inn ?? null,
    city: d.city ?? null,
    headName: d.headName ?? null,
    headTitle: d.headTitle ?? null,
    departmentHeadName: d.departmentHeadName ?? null,
    departmentHeadTitle: d.departmentHeadTitle ?? null,
    departmentName: d.departmentName ?? null,
  };
  if (before) {
    result = await prisma.institution.update({ where: { id: before.id }, data: payload });
  } else {
    result = await prisma.institution.create({ data: payload });
  }
  await audit({ userId: session.userId, action: before ? "UPDATE" : "CREATE", entity: "Institution", entityId: result.id, before, after: result });
  revalidatePath("/institution");
}
