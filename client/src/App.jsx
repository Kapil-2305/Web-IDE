import { useCallback, useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import Terminal from './components/terminal'
import FileTree from './components/tree'
import socket from './socket'
import AceEditor from 'react-ace'

import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/ext-language_tools";

function App() {
    const [fileTree, setFileTree] = useState({});
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedFileContent, setSelectedFileContent] = useState('');
    const [code, setCode] = useState('');

    const isSaved = selectedFileContent === code;

    const getFileTree = async () => {
        const res = await fetch('http://localhost:9000/files');
        const data = await res.json();
        setFileTree(data.tree);
    }

    useEffect(()=>{
        getFileTree();
    }, []);

    useEffect(()=>{
        socket.on('file:refresh', getFileTree);
        return () => {
            socket.off('file:refresh', getFileTree);
        }
    }, []);

    const getFileContent = useCallback(async () => {
        if(!selectedFile) return;
        const res = await fetch(`http://localhost:9000/files/content?path=${selectedFile}`);
        const data = await res.json();
        setSelectedFileContent(data.content);
    }, [selectedFile]);

    useEffect(()=>{
        if(selectedFile){
            getFileContent();
        }
    }, [selectedFile]);

    useEffect(()=>{
        if(selectedFile && selectedFileContent){
            setCode(selectedFileContent);
        }
    }, [selectedFileContent, selectedFile]);

    useEffect(()=>{
        setCode("");
    }, [selectedFile])

    useEffect(()=>{
        if(code && !isSaved){
            const timer = setTimeout(()=>{
                socket.emit('file:change', {path: selectedFile, content: code});
            }, 5*1000);
            return () => {
                clearTimeout(timer);
            };
        }
    }, [code, selectedFile, isSaved]);

    return (
        <div className='playground-container'>
            <div className='editor-container'>
                <div className='files'>
                    <FileTree onSelect={(path)=> setSelectedFile(path)} tree={fileTree}/>
                </div>
                <div className='editor'>
                    {selectedFile && <p>{selectedFile.replaceAll("/", " > ")} {isSaved ? 'Saved' : 'Unsaved'}</p>}
                    <AceEditor value={code} onChange={(e)=> setCode(e)}/>
                </div>
            </div>
            <div className='terminal-container'>
                <Terminal/>
            </div>
        </div>
    )
}

export default App
