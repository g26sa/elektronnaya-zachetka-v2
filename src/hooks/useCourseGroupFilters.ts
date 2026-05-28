"use client";

import { useMemo, useState } from "react";
import {
  filterGroupNamesByCourse,
  groupMatchesCourse,
  uniqueCoursesFromGroupNames,
} from "@/lib/group-course";

/** Каскад курс → группа по второй цифре в названии группы. */
export function useCourseGroupFilters(
  groupNames: string[],
  opts?: { initialCourse?: string; initialGroup?: string }
) {
  const [course, setCourse] = useState(opts?.initialCourse ?? "");
  const [groupName, setGroupName] = useState(opts?.initialGroup ?? "");

  const courses = useMemo(() => uniqueCoursesFromGroupNames(groupNames), [groupNames]);

  const groups = useMemo(
    () => filterGroupNamesByCourse(groupNames, course),
    [groupNames, course]
  );

  const pickCourse = (v: string) => {
    setCourse(v);
    setGroupName("");
  };

  return {
    course,
    groupName,
    courses,
    groups,
    setCourse: pickCourse,
    setGroupName,
    groupMatches: (name: string, c: string) => (c ? groupMatchesCourse(name, c) : true),
  };
}
