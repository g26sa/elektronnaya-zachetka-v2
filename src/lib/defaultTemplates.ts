/**
 * Шаблоны по умолчанию. Используются при первичном сидинге; затем
 * заведующий отделением может редактировать их в /templates без программирования.
 *
 * Поддерживаемый синтаксис:
 *   {{var.path}}                — подстановка
 *   {{#each list}} ... {{/each}}
 *   {{#if value}} ... {{/if}}
 *   {{{html}}}                  — без экранирования (использовать с осторожностью)
 *
 * Подписи:
 *   {{institution.headName}}            — директор учреждения (для общей шапки)
 *   {{institution.departmentHeadName}}  — заведующий отделением (для подписей в учебных документах)
 */

export const DEFAULT_TEMPLATES: { code: string; name: string; description: string; content: string }[] = [
  {
    code: "RECORD_BOOK",
    name: "Зачётная книжка (титул)",
    description: "Титульный лист зачётной книжки",
    content: `<div class="document">
  <header class="text-center border-b border-black pb-3 mb-6">
    <div class="text-[12px] uppercase">{{institution.name}}</div>
    {{#if institution.address}}<div class="text-[11px]">{{institution.address}}</div>{{/if}}
    {{#if institution.departmentName}}<div class="text-[11px]">{{institution.departmentName}}</div>{{/if}}
    <h1>Зачётная книжка № {{student.recordBookNumber}}</h1>
  </header>

  <table>
    <tr><th class="w-1/3">Фамилия, имя, отчество</th><td>{{student.fullName}}</td></tr>
    <tr><th>Дата рождения</th><td>{{student.birthDate}}</td></tr>
    <tr><th>Группа</th><td>{{student.group}}</td></tr>
    <tr><th>Специальность / направление</th><td>{{student.speciality}}</td></tr>
    <tr><th>Дата зачисления</th><td>{{student.enrollmentDate}}</td></tr>
    <tr><th>Приказ о зачислении</th><td>{{student.enrollmentOrder}}</td></tr>
  </table>

  <p class="text-[11px] text-right mt-4">Дата формирования: {{today}}</p>

</div>`,
  },
  {
    code: "ATTESTATION_REPORT",
    name: "Сводная ведомость промежуточной аттестации",
    description: "Сводная таблица всех оценок студента",
    content: `<div class="document">
  <header class="text-center border-b border-black pb-3 mb-6">
    <div class="text-[12px] uppercase">{{institution.name}}</div>
    {{#if institution.departmentName}}<div class="text-[11px]">{{institution.departmentName}}</div>{{/if}}
    <h1>Сводная ведомость промежуточной аттестации</h1>
    <p class="text-[12px]">Студент: {{student.fullName}} · группа {{student.group}}</p>
    <p class="text-[12px]">Зачётная книжка № {{student.recordBookNumber}}</p>
    <p class="text-[11px] text-right">Дата формирования: {{today}}</p>
  </header>

  <table>
    <thead>
      <tr>
        <th>№</th><th>Семестр</th><th>Дисциплина</th><th>Часы / з.е.</th><th>Тип</th><th>Оценка</th><th>Дата</th><th>Преподаватель</th>
      </tr>
    </thead>
    <tbody>
      {{#each assessments}}
      <tr>
        <td class="text-center">{{@index}}</td>
        <td>{{semester}}</td>
        <td>{{discipline}}</td>
        <td class="text-center">{{hours}} / {{creditUnits}}</td>
        <td>{{type}}</td>
        <td class="text-center"><b>{{grade}}</b></td>
        <td class="text-center">{{date}}</td>
        <td>{{teacher}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>

</div>`,
  },
  {
    code: "PRACTICE_REPORT",
    name: "Отчёт по практике",
    description: "Сводный отчёт по всем практикам",
    content: `<div class="document">
  <header class="text-center border-b border-black pb-3 mb-6">
    <div class="text-[12px] uppercase">{{institution.name}}</div>
    {{#if institution.departmentName}}<div class="text-[11px]">{{institution.departmentName}}</div>{{/if}}
    <h1>Отчёт о прохождении практики</h1>
    <p class="text-[12px]">{{student.fullName}} · группа {{student.group}}</p>
    <p class="text-[11px] text-right">Дата формирования: {{today}}</p>
  </header>

  <table>
    <thead>
      <tr>
        <th>№</th><th>Курс</th><th>Семестр</th><th>Вид</th><th>Место</th>
        <th>Часы / з.е.</th><th>Период</th><th>Оценка</th>
        <th>Руководитель от учреждения</th><th>Руководитель от организации</th>
      </tr>
    </thead>
    <tbody>
      {{#each practices}}
      <tr>
        <td>{{@index}}</td>
        <td class="text-center">{{course}}</td>
        <td>{{semester}}</td>
        <td>{{kind}}</td>
        <td>{{place}}</td>
        <td class="text-center">{{hours}} / {{creditUnits}}</td>
        <td class="text-center">{{startDate}} — {{endDate}}</td>
        <td class="text-center"><b>{{grade}}</b></td>
        <td>{{instSupervisor}}</td>
        <td>{{orgSupervisor}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>

</div>`,
  },
  {
    code: "GIA_REPORT",
    name: "Отчёт по ВКР",
    description: "ВКР, защита, государственный экзамен",
    content: `<div class="document">
  <header class="text-center border-b border-black pb-3 mb-6">
    <div class="text-[12px] uppercase">{{institution.name}}</div>
    {{#if institution.departmentName}}<div class="text-[11px]">{{institution.departmentName}}</div>{{/if}}
    <h1>Выпускная квалификационная работа</h1>
    <p class="text-[12px]">{{student.fullName}} · {{student.group}}</p>
    <p class="text-[11px] text-right">Дата формирования: {{today}}</p>
  </header>

  {{#if vkr}}
  <h2>Выпускная квалификационная работа</h2>
  <table>
    <tr><th class="w-1/3">Тема</th><td>{{vkr.topic}}</td></tr>
    <tr><th>Вид</th><td>{{vkr.type}}</td></tr>
    <tr><th>Приказ об утверждении</th><td>{{vkr.approvedOrder}} от {{vkr.approvedDate}}</td></tr>
    <tr><th>Научный руководитель</th><td>{{vkr.supervisor}}</td></tr>
  </table>

  {{#if vkr.defense}}
  <h2>Защита ВКР</h2>
  <table>
    <tr><th class="w-1/3">Допуск</th><td>{{vkr.defense.admission}} ({{vkr.defense.admissionDate}})</td></tr>
    <tr><th>Дата защиты</th><td>{{vkr.defense.date}}</td></tr>
    <tr><th>Оценка</th><td><b>{{vkr.defense.grade}}</b></td></tr>
    <tr><th>Председатель ГЭК</th><td>{{vkr.defense.chair}}</td></tr>
    <tr><th>Протокол</th><td>{{vkr.defense.protocolNumber}}</td></tr>
  </table>
  {{/if}}
  {{/if}}

  {{#if stateExams}}
  <h2>Государственный экзамен</h2>
  <table>
    <thead>
      <tr><th>Название</th><th>Допуск</th><th>Дата</th><th>Оценка</th><th>Председатель ГЭК</th><th>Протокол</th></tr>
    </thead>
    <tbody>
      {{#each stateExams}}
      <tr>
        <td>{{name}}</td>
        <td>{{admission}}</td>
        <td>{{date}}</td>
        <td><b>{{grade}}</b></td>
        <td>{{chair}}</td>
        <td>{{protocolNumber}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>
  {{/if}}

</div>`,
  },
];
