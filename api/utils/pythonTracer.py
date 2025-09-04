import sys
import json
import io
import ast
import bdb


class Debugger(bdb.Bdb):
    """Simple debugger collecting execution events."""

    def __init__(self, breakpoints=None):
        super().__init__()
        self.events = []
        self.call_stack = []
        self.breakpoints = set(breakpoints or [])

    def _snapshot(self, frame, **extra):
        entry = {
            'line': frame.f_lineno,
            'locals': {k: repr(v) for k, v in frame.f_locals.items()},
            'callStack': [f['func'] for f in self.call_stack],
        }
        entry.update(extra)
        if frame.f_lineno in self.breakpoints:
            entry['breakpoint'] = True
        self.events.append(entry)

    # bdb callbacks
    def user_call(self, frame, arg):
        func_name = frame.f_code.co_name
        self.call_stack.append({'func': func_name, 'line': frame.f_lineno})
        self._snapshot(frame, event='call')

    def user_line(self, frame):
        self._snapshot(frame, event='line')

    def user_return(self, frame, value):
        self._snapshot(frame, event='return', return_value=repr(value))
        if self.call_stack:
            self.call_stack.pop()

    def user_exception(self, frame, exc_info):
        exc_type, exc, tb = exc_info
        self._snapshot(frame, event='exception', exception=repr(exc))

    # expression tracing helper
    def trace_expr(self, value, line, expr_source):
        entry = {
            'event': 'expr',
            'line': line,
            'expr': expr_source,
            'value': repr(value),
            'callStack': [f['func'] for f in self.call_stack],
        }
        if line in self.breakpoints:
            entry['breakpoint'] = True
        self.events.append(entry)
        return value


class ExprTracer(ast.NodeTransformer):
    def __init__(self, source):
        self.source = source

    def visit(self, node):
        node = super().visit(node)
        if isinstance(node, ast.expr) and not isinstance(node, (ast.Constant, ast.Name)):
            expr_source = ast.get_source_segment(self.source, node) or ''
            line = getattr(node, 'lineno', -1)
            new_node = ast.Call(
                func=ast.Name(id='trace_expr', ctx=ast.Load()),
                args=[node, ast.Constant(line), ast.Constant(expr_source)],
                keywords=[]
            )
            return ast.copy_location(new_node, node)
        return node


def instrument_code(code, script_path):
    tree = ast.parse(code, filename=script_path, mode='exec')
    tree = ExprTracer(code).visit(tree)
    ast.fix_missing_locations(tree)
    return tree


def main(script_path, breakpoints=None):
    debugger = Debugger(breakpoints)
    with open(script_path, 'r') as f:
        code = f.read()
    stdout_buffer = io.StringIO()
    sys.stdout = stdout_buffer
    status = 'ok'
    error = ''
    try:
        tree = instrument_code(code, script_path)
        global_env = {'trace_expr': debugger.trace_expr}
        debugger.runctx(compile(tree, script_path, 'exec'), global_env, global_env)
    except Exception as e:
        status = 'error'
        error = str(e)
    finally:
        sys.stdout = sys.__stdout__
    result = {
        'status': status,
        'stdout': stdout_buffer.getvalue(),
        'traces': debugger.events,
    }
    if status == 'error':
        result['error'] = error
    print(json.dumps(result))


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'status': 'error', 'error': 'No script path provided', 'traces': [], 'stdout': ''}))
    else:
        breakpoints = []
        if len(sys.argv) > 2:
            try:
                breakpoints = json.loads(sys.argv[2])
            except Exception:
                breakpoints = []
        main(sys.argv[1], breakpoints)
