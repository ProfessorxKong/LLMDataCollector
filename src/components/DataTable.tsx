import React, { useContext, useEffect, useState } from 'react';
import { Tabs, Table, Input, Button, message } from 'antd';
import type { TabsProps } from 'antd';
import { DataContext } from '../App';
import { useRequest } from 'ahooks';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
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

    // 从 JSON 文件获取数据
    const { data: jsonData } = useRequest(() => {
        return Promise.resolve(readingData);
    });

    useEffect(() => {
        if (jsonData) {
            console.log('准备更新到 state 的数据:', jsonData);
            console.log('数据总条数:', jsonData.length);
            dispatch({ type: 'FETCH_SUCCESS', payload: jsonData });
            // 设置默认选中的 tab
            if (jsonData.length > 0) {
                setActiveKey(jsonData[0].domain);
            }
        }
    }, [jsonData, dispatch]);

    // 获取所有唯一的 domain
    const domains = Array.from(new Set(state.data.map((item: DataItem) => item.domain)));
    console.log('当前 domains:', domains);
    console.log('当前 state.data 总条数:', state.data.length);
    console.log('每个 domain 的数据条数:', domains.map(domain => ({
        domain,
        count: state.data.filter((item: DataItem) => item.domain === domain).length
    })));

    // 表格列定义
    const columns = [
        {
            title: '问题',
            dataIndex: 'question',
            key: 'question',
            width: '10%',
            render: (text: string, record: DataItem) => (
                <TextArea
                    value={text}
                    onChange={(e) => handleEdit(record.document_id, 'question', e.target.value)}
                    autoSize
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
                    value={text}
                    onChange={(e) => handleEdit(record.document_id, 'answer', e.target.value)}
                    autoSize
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
                <Button type="link" onClick={() => handleSave(record)}>
                    保存
                </Button>
            ),
        },
    ];

    // 处理编辑
    const handleEdit = (id: string, field: string, value: string) => {
        const newData = state.data.map((item: DataItem) => {
            if (item.document_id === id) {
                return { ...item, [field]: value };
            }
            return item;
        });
        dispatch({ type: 'UPDATE_DATA', payload: newData });
    };

    // 处理保存
    const handleSave = async (record: DataItem) => {
        try {
            // 这里添加实际的保存逻辑
            console.log('保存的数据：', record);
            message.success('保存成功');
        } catch {
            message.error('保存失败');
        }
    };

    // 标签页配置
    const items: TabsProps['items'] = domains.map((domain) => {
        const domainData = state.data.filter((item: DataItem) => item.domain === domain);
        console.log(`${domain} 的数据条数:`, domainData.length);

        return {
            key: domain as string,
            label: `${domain} (${domainData.length})`,
            children: (
                <Table
                    columns={columns}
                    dataSource={domainData}
                    rowKey={(record) => `${record.document_id}-${record.domain}-${record.question}`}
                    loading={state.loading}
                    pagination={{
                        ...pagination,
                        showSizeChanger: true,
                        showTotal: (total) => `共 ${total} 条数据`,
                        total: domainData.length,
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
            ),
        };
    });

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
                {items.find(item => item.key === activeKey)?.children}
            </div>
        </div>
    );
};

export default DataTable; 