import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { contractABI, contractAddress } from '../utils/constants';

export const TransactionContext = React.createContext();

const { ethereum } = window;

const getEthereumContract = () => {
    const provider = new ethers.providers.Web3Provider(ethereum);
    const signer = provider.getSigner();
    const transactionContract = new ethers.Contract(contractAddress, contractABI, signer);

    return transactionContract;
    
}
export const TransactionProvider = ({ children }) => {

   
    const [currentAccount, setCurrentAccount] = useState('');
    const [formData, setFormData] = useState({ addressTo: '', amount: '', keyword: '', message: ''});
    const [isLoading, setIsLoading] = useState(false);
    const [transactionCount, setTransactionCount] = useState(localStorage.getItem('transactionCount'))
    const [transactions, setTransactions] = useState([]);

    const handleChange = (e, name, value) => {
        setFormData((prevState) => ({...prevState, [name]: e.target.value}));
    }

    const getAllTransaction = async () => {
        try {
            if(!ethereum) return alert("Please install metamask");
            const transactionContract = getEthereumContract();
            const availableTransaction = await transactionContract.getAllTransactions();

            const structuredTransactions = availableTransaction.map((transaction) => ({
                addressTo: transaction.receiver,
                addressFrom: transaction.sender,
                timestamp: new Date(transaction.timestamp.toNumber() * 1000).toLocaleString(),
                message: transaction.message,
                keyword: transaction.keyword,
                amount: parseInt(transaction.amount._hex) / (10 ** 18)
            }));
            setTransactions(structuredTransactions);
        }
        catch (err) {

        }
    }

    const checkIfWalletIsConnected = async () => {
        try{
            if(!ethereum) return alert("Please install metamask");

            const accounts = await ethereum.request({ method: 'eth_accounts' });
    
            if(accounts.length) {
                setCurrentAccount(accounts[0]);

                getAllTransaction();
            }else{
                console.log("no accounts found");
            }
    
        }
        catch(err){
            console.log("error",err);
            throw new Error("No etherum object");
        }
       
    }

    const checkIfTransactionExist = async () => {
        try {
            const transactionContract = getEthereumContract();
            const transactonCount = await transactionContract.getTransactionCount();
            
            window.localStorage.setItem("transactionCount", transactionCount);

        }
        catch(err){
            console.log("error",err);
            throw new Error("No etherum object");
        }
    }

    const connectWallet = async () => {

        try {
            if(!ethereum) return alert("Please install metamask");
            const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
            console.log("error",accounts);

            setCurrentAccount(accounts);


        }
        catch (err) {
            console.log("error",err);
            throw new Error("No etherum object");
        }
    }

    const sendTransaction = async () => {
        try {
            if(!ethereum) return alert("Please install metamask");

            const { addressTo, amount, keyword, message } = formData;
            const transactionContract = getEthereumContract();
            const parsedAmount = ethers.utils.parseEther(amount);

            await ethereum.request({
                method: 'eth_sendTransaction',
                params: [{
                    from: currentAccount,
                    to: addressTo,
                    gas: '0x5208',
                    value: parsedAmount._hex,

                }]
            });

            const transactionHash = await transactionContract.addToBlockchain(addressTo, parsedAmount, message, keyword);
            setIsLoading(true);
            console.log(`Loading - ${transactionHash.hash}`);
            await transactionHash.wait();
            setIsLoading(false);
            console.log(`Success - ${transactionHash.hash}`);

            const transactonCount = await transactionContract.getTransactionCount();
            setTransactionCount(transactonCount.toNumber())

        }
        catch (err) {
            console.log("error",err);
            throw new Error("No etherum object");
        }
    }

    useEffect(() => {
        checkIfWalletIsConnected();
        checkIfTransactionExist();
    },[]);


    return (
        <TransactionContext.Provider value={{ connectWallet, transactions, currentAccount, formData, setFormData, handleChange, sendTransaction, isLoading }}>
            {children}
        </TransactionContext.Provider>
    )
}