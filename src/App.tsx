import { Layout } from 'antd';
import { createContext } from 'react';
import { useReducer } from 'react';
import './App.css';
import DataTable from './components/DataTable';

const { Content } = Layout;

interface DataItem {
  document_id: string;
  domain: string;
  question: string;
  answer: string;
  chunk_texts: string | string[];
  document?: string;
  question_type?: string;
}

interface State {
  data: DataItem[];
  loading: boolean;
  error: string | null;
}

type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: DataItem[] }
  | { type: 'FETCH_ERROR'; payload: string }
  | { type: 'UPDATE_DATA'; payload: DataItem[] };

// 定义初始状态
const initialState: State = {
  data: [],
  loading: false,
  error: null
};

// 定义 reducer
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, data: action.payload };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'UPDATE_DATA':
      return { ...state, data: action.payload };
    default:
      return state;
  }
}

// 创建 Context
export const DataContext = createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
}>({ state: initialState, dispatch: () => { } });

function App() {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <DataContext.Provider value={{ state, dispatch }}>
      <Layout style={{ minHeight: '100vh' }}>
        <Content style={{ padding: '24px' }}>
          <DataTable />
        </Content>
      </Layout>
    </DataContext.Provider>
  );
}

export default App;
