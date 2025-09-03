import vm from 'vm';
import { instrumentJavaScript } from './execution.controller.js';

function createContext(events) {
  const sandbox = {};
  return {
    context: vm.createContext({
      sandbox,
      console: {
        log: (...args) => {
          events.push({ event: 'log', value: args.join(' ') });
        },
      },
      __trace: (line) => {
        events.push({ event: 'step', line, locals: { ...sandbox } });
      },
    }),
    sandbox,
  };
}

describe('instrumentJavaScript', () => {
  test('handles let/const in strings and comments', async () => {
    const source =
      `// comment with let and const\n` +
      `const msg = "let inside string"; // inline const\n` +
      `let x = 1;\n` +
      `console.log(msg);`;
    const instrumented = instrumentJavaScript(source);

    expect(instrumented).toContain('comment with let and const');
    expect(instrumented).toContain('"let inside string"');
    expect(instrumented).toMatch(/var msg/);
    expect(instrumented).toMatch(/var x/);

    const events = [];
    const { context } = createContext(events);
    const script = new vm.Script(instrumented);
    await script.runInContext(context);

    const logEvent = events.find((e) => e.event === 'log');
    expect(logEvent.value).toBe('let inside string');
    expect(events.filter((e) => e.event === 'step').length).toBeGreaterThan(0);
  });
});
