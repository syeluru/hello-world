import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCommand, findWakePhrase, extractDateTime } from '../public/js/parser.js';

// Tuesday, 22 Sep 2026, 10:00
const NOW = new Date(2026, 8, 22, 10, 0);
const p = (s) => parseCommand(s, NOW);

test('wake phrase', () => {
  assert.deepEqual(findWakePhrase('hello assistant add milk'), { rest: 'add milk' });
  assert.deepEqual(findWakePhrase('Hey, assistant'), { rest: '' });
  assert.deepEqual(findWakePhrase('Hello assistance.'), { rest: '' });
  assert.equal(findWakePhrase('what a lovely day'), null);
});

test('groceries', () => {
  assert.deepEqual(p('add milk and eggs to the grocery list'), { action: 'add', list: 'groceries', items: ['Milk', 'Eggs'] });
  assert.deepEqual(p('put bananas, bread and some peanut butter on the shopping list'),
    { action: 'add', list: 'groceries', items: ['Bananas', 'Bread', 'Peanut butter'] });
  assert.deepEqual(p("we're out of coffee"), { action: 'add', list: 'groceries', items: ['Coffee'] });
  assert.deepEqual(p('we need more paper towels'), { action: 'add', list: 'groceries', items: ['Paper towels'] });
  assert.deepEqual(p('add to the grocery list apples'), { action: 'add', list: 'groceries', items: ['Apples'] });
  assert.deepEqual(p('add yogurt'), { action: 'add', list: 'groceries', items: ['Yogurt'] });
  assert.deepEqual(p('add butter to groceries'), { action: 'add', list: 'groceries', items: ['Butter'] });
});

test('todos', () => {
  assert.deepEqual(p('add call the plumber to my to do list'), { action: 'add', list: 'todos', title: 'Call the plumber' });
  assert.deepEqual(p('add renew passport to the todo list'), { action: 'add', list: 'todos', title: 'Renew passport' });
  assert.deepEqual(p('remind me to water the plants'), { action: 'add', list: 'todos', title: 'Water the plants' });
  assert.deepEqual(p('remind me to pay rent on friday'), { action: 'add', list: 'todos', title: 'Pay rent', due: '2026-09-25' });
  assert.deepEqual(p('add take out the trash to the chores list'), { action: 'add', list: 'todos', title: 'Take out the trash' });
});

test('events', () => {
  assert.deepEqual(p('add dentist appointment on friday at 3pm to the calendar'),
    { action: 'add', list: 'events', title: 'Dentist appointment', date: '2026-09-25', time: '15:00' });
  assert.deepEqual(p('schedule soccer practice tomorrow at 5:30 p.m.'),
    { action: 'add', list: 'events', title: 'Soccer practice', date: '2026-09-23', time: '17:30' });
  assert.deepEqual(p("mom's birthday dinner on october 3rd at 7"),
    { action: 'add', list: 'events', title: "Mom's birthday dinner", date: '2026-10-03', time: '19:00' });
  assert.deepEqual(p('add parent teacher conference to the calendar next tuesday at 4'),
    { action: 'add', list: 'events', title: 'Parent teacher conference', date: '2026-09-29', time: '16:00' });
  assert.deepEqual(p('add haircut to the calendar'),
    { action: 'add', list: 'events', title: 'Haircut', date: null, time: null });
});

test('remove and read', () => {
  assert.deepEqual(p('remove milk from the grocery list'), { action: 'remove', list: 'groceries', items: ['Milk'] });
  assert.deepEqual(p('cross off eggs'), { action: 'remove', list: 'groceries', items: ['Eggs'] });
  assert.deepEqual(p("what's on the grocery list"), { action: 'read', list: 'groceries' });
  assert.deepEqual(p("what's coming up"), { action: 'read', list: 'events' });
  assert.deepEqual(p('read my to do list'), { action: 'read', list: 'todos' });
});

test('dates', () => {
  const d = (s) => extractDateTime(s, NOW);
  assert.equal(d('on friday').date, '2026-09-25');
  assert.equal(d('next friday').date, '2026-10-02');
  assert.equal(d('on tuesday').date, '2026-09-29');
  assert.equal(d('this tuesday').date, '2026-09-22');
  assert.equal(d('in 2 weeks').date, '2026-10-06');
  assert.equal(d('the 5th').date, '2026-10-05');
  assert.equal(d('on 12/25').date, '2026-12-25');
  assert.equal(d('the 3rd of march').date, '2027-03-03');
  assert.deepEqual(d('at noon'), { date: '2026-09-22', time: '12:00', rest: '' });
  assert.equal(d('at 9 in the morning').time, '09:00');
  assert.equal(d('at 10').time, '10:00');
});
