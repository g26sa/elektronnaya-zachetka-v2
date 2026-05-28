export type PracticePlanSlot = {
  id: string;
  groupId: string;
  groupName: string;
  groupSpeciality: string;
  semesterId: string;
  semesterNumber: number;
  semesterYear: string;
};

export type StudentRef = {
  id: string;
  fullName: string;
  groupId: string;
};
