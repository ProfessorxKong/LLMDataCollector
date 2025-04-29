import React, { useEffect, useState } from 'react';
import { Tabs, Table, Input, Button, message } from 'antd';
import type { TabsProps } from 'antd';
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
    const [activeKey, setActiveKey] = useState<string>('');
    const [collapsed, setCollapsed] = useState(false);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
    });
    const [localData, setLocalData] = useState<DataItem[]>([]);

    // 从 JSON 文件获取数据
    const { data: jsonData } = useRequest(() => {
        return Promise.resolve(readingData);
    });

    // 生成唯一标识符
    const generateUniqueKey = (item: DataItem) => {
        return `${item.document_id}-${item.question}-${item.answer}`;
    };

    useEffect(() => {
        if (jsonData) {
            setLocalData(jsonData);
            if (jsonData.length > 0) {
                setActiveKey(jsonData[0].domain);
            }
        }
    }, [jsonData]);

    // 获取所有唯一的 domain
    const domains = Array.from(new Set(localData.map((item: DataItem) => item.domain)));

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
                    onBlur={(e) => {
                        const newData = localData.map((item: DataItem) => {
                            if (generateUniqueKey(item) === generateUniqueKey(record)) {
                                return { ...item, question: e.target.value };
                            }
                            return item;
                        });
                        setLocalData(newData);
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
                    onBlur={(e) => {
                        const newData = localData.map((item: DataItem) => {
                            if (generateUniqueKey(item) === generateUniqueKey(record)) {
                                return { ...item, answer: e.target.value };
                            }
                            return item;
                        });
                        setLocalData(newData);
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
            const newData = localData.map((item: DataItem) => {
                if (generateUniqueKey(item) === generateUniqueKey(record)) {
                    return { ...item, status: 'correct' as const };
                }
                return item;
            });
            setLocalData(newData);
            message.success('已标记为正确');
        } catch {
            message.error('操作失败');
        }
    };

    const handleIncorrect = async (record: DataItem) => {
        try {
            const newData = localData.map((item: DataItem) => {
                if (generateUniqueKey(item) === generateUniqueKey(record)) {
                    return { ...item, status: 'incorrect' as const };
                }
                return item;
            });
            setLocalData(newData);
            message.success('已标记为错误');
        } catch {
            message.error('操作失败');
        }
    };

    // 标签页配置
    const items: TabsProps['items'] = domains.map((domain) => {
        const domainData = localData.filter((item: DataItem) => item.domain === domain);
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

        try {
            const currentDomainData = localData.filter((item: DataItem) => item.domain === activeKey);
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
        } catch (error) {
            console.error('导出数据失败:', error);
            message.error('导出数据失败，请重试');
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
                </div>
                {activeKey && (
                    <Table
                        columns={columns}
                        dataSource={localData.filter((item: DataItem) => item.domain === activeKey)}
                        rowKey={(record) => generateUniqueKey(record)}
                        rowClassName={(record: DataItem) => {
                            if (record.status === 'correct') return 'correct-row';
                            if (record.status === 'incorrect') return 'incorrect-row';
                            return '';
                        }}
                        pagination={{
                            ...pagination,
                            showSizeChanger: true,
                            showTotal: (total) => `共 ${total} 条数据`,
                            total: localData.filter((item: DataItem) => item.domain === activeKey).length,
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