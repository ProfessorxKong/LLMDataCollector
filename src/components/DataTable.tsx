import React, { useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Tabs, Table, Input, Button, message } from 'antd';
import type { TabsProps } from 'antd';
import { DataContext } from '../App';
import { useRequest } from 'ahooks';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import { MenuFoldOutlined, MenuUnfoldOutlined, ExportOutlined } from '@ant-design/icons';
import readingData from '../assets/reading_567.json';
import '../styles/DataTable.css';

const { TextArea } = Input;

interface DataItem {
    document_id: string;
    domain: string;
    question: string;
    answer: string;
    chunk_texts: string | string[];
    document?: string;
    question_type?: string;
    status?: 'correct' | 'incorrect';
}

interface SavedData {
    [key: string]: DataItem;
}

// interface RawDataItem {
//     domain?: string;
//     question?: string;
//     answer?: string;
//     chunk_texts?: string;
// }

const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
    const extractTableContent = (html: string) => {
        if (!html || typeof html !== 'string') {
            return '';
        }
        const tableMatch = html.match(/<table[^>]*>[\s\S]*?<\/table>/);
        return tableMatch ? tableMatch[0] : html;
    };

    return (
        <div className="markdown-content">
            <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeRaw, rehypeKatex]}
                components={{
                    div: (props) => <div {...props} />,
                    table: ({ children, ...props }) => (
                        <table {...props} style={{ width: '100%' }}>
                            {children}
                        </table>
                    ),
                    tr: (props) => <tr {...props} />,
                    td: (props) => <td {...props} />,
                    th: ({ children, ...props }) => (
                        <th {...props} style={{ backgroundColor: '#fafafa' }}>
                            {children}
                        </th>
                    ),
                    img: (props) => <img {...props} style={{ maxWidth: '100%' }} />
                }}
            >
                {extractTableContent(content)}
            </ReactMarkdown>
        </div>
    );
};

const DataTable: React.FC = () => {
    const { state, dispatch } = useContext(DataContext);
    const [activeKey, setActiveKey] = useState<string>('');
    const [collapsed, setCollapsed] = useState(false);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
    });

    // 使用 useRef 来存储定时器
    const timerRef = useRef<number>();

    // 创建防抖的更新函数
    const debouncedUpdate = useCallback((newData: DataItem[]) => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        timerRef.current = window.setTimeout(() => {
            console.log('防抖更新触发，准备保存数据');
            dispatch({ type: 'UPDATE_DATA', payload: newData });

            // 保存到 localStorage
            try {
                const savedData: SavedData = {};
                newData.forEach(item => {
                    const uniqueKey = generateUniqueKey(item);
                    savedData[uniqueKey] = {
                        document_id: item.document_id,
                        domain: item.domain,
                        question: item.question,
                        answer: item.answer,
                        chunk_texts: item.chunk_texts,
                        document: item.document,
                        question_type: item.question_type,
                        status: item.status
                    };
                });
                console.log('准备保存的数据:', savedData);
                const dataToSave = JSON.stringify(savedData);
                console.log('序列化后的数据:', dataToSave);
                localStorage.setItem('savedTableData', dataToSave);
                console.log('数据已自动保存到 localStorage');

                // 验证保存是否成功
                const savedDataCheck = localStorage.getItem('savedTableData');
                console.log('从 localStorage 读取的数据:', savedDataCheck);
                if (savedDataCheck === dataToSave) {
                    console.log('数据保存验证成功');
                } else {
                    console.error('数据保存验证失败');
                }
            } catch (error) {
                console.error('自动保存到 localStorage 失败:', error);
            }
        }, 3000);
    }, [dispatch]);

    // 清理定时器
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    // 从 JSON 文件获取数据
    const { data: jsonData } = useRequest(() => {
        return Promise.resolve(readingData);
    });

    // 从 localStorage 读取保存的数据
    const loadSavedData = (): SavedData => {
        try {
            const savedData = localStorage.getItem('savedTableData');
            if (savedData) {
                return JSON.parse(savedData);
            }
        } catch (error) {
            console.error('读取 localStorage 数据失败:', error);
        }
        return {};
    };

    // 生成唯一标识符
    const generateUniqueKey = (item: DataItem) => {
        return `${item.document_id}-${item.question}-${item.answer}`;
    };

    // 修改保存到本地的处理函数
    const handleSaveToStorage = () => {
        console.log('开始保存数据到 localStorage');
        try {
            const savedData: SavedData = {};
            state.data.forEach(item => {
                const uniqueKey = generateUniqueKey(item);
                savedData[uniqueKey] = {
                    document_id: item.document_id,
                    domain: item.domain,
                    question: item.question,
                    answer: item.answer,
                    chunk_texts: item.chunk_texts,
                    document: item.document,
                    question_type: item.question_type,
                    status: item.status
                };
            });
            console.log('准备保存的数据:', savedData);
            const dataToSave = JSON.stringify(savedData);
            console.log('序列化后的数据:', dataToSave);
            localStorage.setItem('savedTableData', dataToSave);
            console.log('数据已保存到 localStorage');

            // 验证保存是否成功
            const savedDataCheck = localStorage.getItem('savedTableData');
            console.log('从 localStorage 读取的数据:', savedDataCheck);
            if (savedDataCheck === dataToSave) {
                message.success('数据已成功保存到本地存储');
            } else {
                throw new Error('数据保存验证失败');
            }
        } catch (error) {
            console.error('保存到 localStorage 失败:', error);
            message.error('保存数据失败，请重试');
        }
    };

    useEffect(() => {
        console.log('开始加载数据');
        if (jsonData) {
            console.log('原始数据:', jsonData);
            const savedData = loadSavedData();
            console.log('从 localStorage 加载的数据:', savedData);

            // 合并原始数据和保存的数据
            const mergedData = jsonData.map((item: DataItem) => {
                const uniqueKey = generateUniqueKey(item);
                const savedItem = savedData[uniqueKey];
                if (savedItem) {
                    console.log('找到保存的数据:', uniqueKey, savedItem);
                    // 确保合并所有字段
                    return {
                        ...item,
                        question: savedItem.question || item.question,
                        answer: savedItem.answer || item.answer,
                        status: savedItem.status || item.status,
                        document: savedItem.document || item.document,
                        question_type: savedItem.question_type || item.question_type
                    };
                }
                return item;
            });
            console.log('合并后的数据:', mergedData);

            dispatch({ type: 'FETCH_SUCCESS', payload: mergedData });
            if (mergedData.length > 0) {
                setActiveKey(mergedData[0].domain);
            }
        }
    }, [jsonData, dispatch]);

    // 获取所有唯一的 domain
    const domains = Array.from(new Set(state.data.map((item: DataItem) => item.domain)));

    // 表格列定义
    const columns = [
        {
            title: '问题',
            dataIndex: 'question',
            key: 'question',
            width: '10%',
            render: (text: string, record: DataItem) => (
                <TextArea
                    defaultValue={text}
                    autoSize
                    onChange={(e) => {
                        const newData = state.data.map((item: DataItem) => {
                            if (generateUniqueKey(item) === generateUniqueKey(record)) {
                                return { ...item, question: e.target.value };
                            }
                            return item;
                        });
                        debouncedUpdate(newData);
                    }}
                />
            ),
        },
        {
            title: '答案',
            dataIndex: 'answer',
            key: 'answer',
            width: '20%',
            render: (text: string, record: DataItem) => (
                <TextArea
                    defaultValue={text}
                    autoSize
                    onChange={(e) => {
                        const newData = state.data.map((item: DataItem) => {
                            if (generateUniqueKey(item) === generateUniqueKey(record)) {
                                return { ...item, answer: e.target.value };
                            }
                            return item;
                        });
                        debouncedUpdate(newData);
                    }}
                />
            ),
        },
        {
            title: '原文',
            dataIndex: 'chunk_texts',
            key: 'chunk_texts',
            width: '65%',
            render: (text: string | string[]) => (
                <div style={{
                    padding: '8px',
                    border: '1px solid #f0f0f0',
                    borderRadius: '4px',
                    backgroundColor: '#fafafa'
                }}>
                    <MarkdownRenderer content={Array.isArray(text) ? text.join('\n') : text} />
                </div>
            ),
        },
        {
            title: '操作',
            key: 'action',
            width: '5%',
            render: (_: unknown, record: DataItem) => (
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Button
                        type="primary"
                        onClick={() => handleCorrect(record)}
                        style={{ backgroundColor: '#52c41a' }}
                    >
                        正确
                    </Button>
                    <Button
                        type="primary"
                        danger
                        onClick={() => handleIncorrect(record)}
                    >
                        错误
                    </Button>
                </div>
            ),
        },
    ];

    // 处理保存
    const handleCorrect = async (record: DataItem) => {
        try {
            const newData = state.data.map((item: DataItem) => {
                if (generateUniqueKey(item) === generateUniqueKey(record)) {
                    return { ...item, status: 'correct' };
                }
                return item;
            });
            dispatch({ type: 'UPDATE_DATA', payload: newData });
            message.success('已标记为正确');
        } catch {
            message.error('操作失败');
        }
    };

    const handleIncorrect = async (record: DataItem) => {
        try {
            const newData = state.data.map((item: DataItem) => {
                if (generateUniqueKey(item) === generateUniqueKey(record)) {
                    return { ...item, status: 'incorrect' };
                }
                return item;
            });
            dispatch({ type: 'UPDATE_DATA', payload: newData });
            message.success('已标记为错误');
        } catch {
            message.error('操作失败');
        }
    };

    // 标签页配置
    const items: TabsProps['items'] = domains.map((domain) => {
        const domainData = state.data.filter((item: DataItem) => item.domain === domain);
        return {
            key: domain as string,
            label: `${domain} (${domainData.length})`,
            children: null
        };
    });

    // 导出当前领域数据
    const handleExport = () => {
        if (!activeKey) {
            message.warning('请先选择一个领域');
            return;
        }

        const currentDomainData = state.data.filter((item: DataItem) => item.domain === activeKey);
        const jsonString = JSON.stringify(currentDomainData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${activeKey}_data.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        message.success('导出成功');
    };

    // 清空 localStorage 数据
    const handleClearStorage = () => {
        try {
            localStorage.removeItem('savedTableData');
            // 重新加载原始数据
            if (jsonData) {
                dispatch({ type: 'FETCH_SUCCESS', payload: jsonData });
            }
            message.success('已清空本地存储数据');
        } catch (error) {
            console.error('清空 localStorage 失败:', error);
            message.error('清空数据失败');
        }
    };

    return (
        <div className="data-table-container">
            <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
                <div className="sidebar-content">
                    <Tabs
                        items={items}
                        tabPosition="left"
                        style={{ height: '100%' }}
                        activeKey={activeKey}
                        onChange={setActiveKey}
                    />
                </div>
                <Button
                    type="text"
                    icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                    onClick={() => setCollapsed(!collapsed)}
                    className={`toggle-button ${collapsed ? 'collapsed' : 'expanded'}`}
                />
            </div>
            <div className="main-content">
                <div style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                    backgroundColor: '#fff',
                    padding: '16px 0',
                    display: 'flex',
                    gap: '8px',
                    justifyContent: 'flex-end'
                }}>
                    <Button
                        type="primary"
                        icon={<ExportOutlined />}
                        onClick={handleExport}
                        className="export-button"
                        style={{ marginRight: '8px' }}
                    >
                        导出数据
                    </Button>
                    <Button
                        type="primary"
                        onClick={handleSaveToStorage}
                        style={{ marginRight: '8px' }}
                    >
                        保存到本地
                    </Button>
                    <Button
                        type="primary"
                        danger
                        onClick={handleClearStorage}
                    >
                        清空本地数据
                    </Button>
                </div>
                {activeKey && (
                    <Table
                        columns={columns}
                        dataSource={state.data.filter((item: DataItem) => item.domain === activeKey)}
                        rowKey={(record) => generateUniqueKey(record)}
                        loading={state.loading}
                        rowClassName={(record: DataItem) => {
                            if (record.status === 'correct') return 'correct-row';
                            if (record.status === 'incorrect') return 'incorrect-row';
                            return '';
                        }}
                        pagination={{
                            ...pagination,
                            showSizeChanger: true,
                            showTotal: (total) => `共 ${total} 条数据`,
                            total: state.data.filter((item: DataItem) => item.domain === activeKey).length,
                            showQuickJumper: true,
                            showLessItems: true,
                            onChange: (page, pageSize) => {
                                setPagination({
                                    current: page,
                                    pageSize: pageSize,
                                });
                            },
                            onShowSizeChange: (current, size) => {
                                setPagination({
                                    current: current,
                                    pageSize: size,
                                });
                            },
                        }}
                        scroll={{ x: 2400 }}
                    />
                )}
            </div>
        </div>
    );
};

export default DataTable; 