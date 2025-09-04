import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ExecutionVisualizer from '../ExecutionVisualizer';

// Mock the Monaco editor to a simple textarea for tests
jest.mock('@monaco-editor/react', () => ({
  __esModule: true,
  default: ({ value, onChange }) => (
    <textarea data-testid="editor" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

// Minimal mock for d3 to avoid DOM manipulation during tests
jest.mock('d3', () => ({
  select: () => ({
    selectAll: () => ({ remove: jest.fn() }),
  }),
}));

describe('ExecutionVisualizer', () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = undefined;
  });

  test('reset button restores default code snippet', () => {
    render(<ExecutionVisualizer />);

    const editor = screen.getByTestId('editor');
    fireEvent.change(editor, { target: { value: 'console.log("test")' } });
    expect(editor.value).toBe('console.log("test")');

    const resetBtn = screen.getByText('Reset Code');
    fireEvent.click(resetBtn);

    expect(editor.value).toContain('function greet');
  });

  test('step command updates call stack and variables', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ sessionId: '1' }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ event: { event: 'line', line: 1, locals: { a: 1 }, callStack: ['<module>'] } })
      });
    global.fetch = fetchMock;
    render(<ExecutionVisualizer />);

    fireEvent.click(screen.getByText('Run'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByText('Step In'));
    await waitFor(() => {
      expect(screen.getByTestId('call-stack').textContent).toContain('<module>');
    });
    expect(screen.getByTestId('watch-vars').textContent).toContain('a: 1');
  });

  test('toggle breakpoint persists and sends command', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ sessionId: '1' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ breakpoints: [1] }) });
    global.fetch = fetchMock;
    render(<ExecutionVisualizer />);

    fireEvent.click(screen.getByText('Run'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByText('Toggle BP 1'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).command).toBe('setBreakpoint');
    expect(localStorage.getItem('execvis_bp_javascript')).toContain('1');
  });
});
