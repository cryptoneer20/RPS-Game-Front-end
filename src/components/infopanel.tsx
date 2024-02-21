import { useState, useEffect } from 'react';
import { useWallet } from "@solana/wallet-adapter-react";
import axios from 'axios'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { styled } from '@mui/material/styles';
import { IconButton, Drawer, Divider} from '@mui/material'
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SettingsIcon from '@mui/icons-material/Settings';
import { LAMPORTS_PER_SOL, Connection, SystemProgram, PublicKey, Transaction, clusterApiUrl, TransactionInstruction, Keypair } from '@solana/web3.js';
import {TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, Token, MintLayout} from '@solana/spl-token'
import {notification} from 'antd'
import { sendTransactions } from './utility';
const bs58 = require('bs58')

let wallet : any;
// let conn = new Connection("https://solana-api.projectserum.com")
// let conn = new Connection(clusterApiUrl("devnet"))

let conn = new Connection("https://wandering-frosty-surf.solana-mainnet.quiknode.pro/cd3964d6c120b94460e242604421ed8931bee8f3/")
let treasuryWallet = new PublicKey("sedSiYvjPdT5RY2b2UEJpRimiKfhMDYHQrCGpwaJss5")

const SEVERURL = "https://solnino.io/server/"

const DrawerHeader = styled('div')(({ theme }) => ({
	display: 'flex',
	alignItems: 'center',
	textAlign : "center",
	padding: theme.spacing(0, 1),
	...theme.mixins.toolbar,
	justifyContent: 'flex-start',
}));

export default function InfoPanel(props : any){
    wallet = useWallet()

    const [openSettingPanel, setOpenSettingPanel] = useState(false)
	const [walletAmount, setWalletAmount] = useState(0)
	const [depositAmount, setDepositAmount] = useState(0)
	const [walletAmountStr, setWalletAmountStr] = useState('0')
	const [depositAmountStr, setDepositAmountStr] = useState('0')
	// const [inputDeposit, setInputDeposit] = useState("")
	// const [inputWithdraw, setInputWithdraw] = useState("")
	const [inputAmount, setInputAmount] = useState("")
	const [isInvalidWalletAmount, setIsInvalidWalletAmount] = useState(false)
	const [isInvalidDepositAmount, setIsInvalidDepositAmount] = useState(false)

	
	const [isWaiting, setIsWaiting] = useState(false)

    useEffect(()=>{
		const interval = setInterval(()=>{
            getSolAmountInfo()
        },10000)
        return ()=> clearInterval(interval)
	},[])

    useEffect(()=>{
        getSolAmountInfo()
        if(wallet.connected===false) setOpenSettingPanel(false)
    },[wallet, wallet.connected, wallet.publicKey])

    useEffect(()=>{
    	props.callback(depositAmount)
    },[depositAmount])

	async function getSolAmountInfo(){
        if(wallet.connected){
            try{
                let amount = (await conn.getBalance(wallet.publicKey))/LAMPORTS_PER_SOL
                let roundAmount = Math.round(amount*1000) / 1000
                setWalletAmount(amount * LAMPORTS_PER_SOL)
                setWalletAmountStr(Math.abs(roundAmount-amount) > 0.0005 ? '~'+roundAmount : roundAmount.toString())
            }catch(err){
                setWalletAmount(0)
                setWalletAmountStr('0')
            }
            try{
                axios.get(SEVERURL+"rpsgame/wallet?wallet="+wallet.publicKey.toBase58()).then((response)=>{
                    let amount = response.data.data.amount / LAMPORTS_PER_SOL
                    let roundAmount = Math.round(amount*1000) / 1000
                    setDepositAmount(response.data.data.amount)
                    setDepositAmountStr(Math.abs(roundAmount-amount) > 0.005 ? '~'+roundAmount : roundAmount.toString())
                })
            }catch(err){
                setDepositAmount(0)
                setDepositAmountStr('0')
            }
        }else{
            setWalletAmount(0)
            setWalletAmountStr('0')
            setDepositAmount(0)
            setDepositAmountStr('0')
        }
	}

	const depositSol = async()=> {
		setIsWaiting(true)
		try{
			if(Number(inputAmount)===0){
				openNotification('error',"Please check the deposit amount")
				return;
			}
			let transaction = new Transaction()
			let lamports = Number(inputAmount) * LAMPORTS_PER_SOL
			transaction.add(SystemProgram.transfer({
				fromPubkey : wallet.publicKey,
				toPubkey : treasuryWallet,
				lamports : lamports
			}))
			transaction.feePayer = wallet.publicKey
			transaction.recentBlockhash = (await conn.getRecentBlockhash('max')).blockhash
			await transaction.setSigners(wallet.publicKey)
			const signedTransaction = await wallet.signTransaction(transaction)
			openNotification('info', "Transaction Sent")
			let response = await axios.post(SEVERURL+"rpsgame/deposit",{
				wallet: wallet.publicKey,
				amount : lamports,
				transaction : await signedTransaction.serialize()
			})
			if(response.data.response===true){
				openNotification('success', "Deposit Success")
			}else{
				openNotification('error', "Deposit Failed")
			}
			
			getSolAmountInfo()
		}catch(err){
			openNotification('error', "Deposit Failed")
		}
		setIsWaiting(false)
	}

	const withdrawSol = async()=> {
		setIsWaiting(true)
		try{
			if(Number(inputAmount)===0){
				openNotification('error',"Please check the withdraw amount")
				return;
			}
			let preResponse = await axios.post(SEVERURL+"rpsgame/prewithdraw",{wallet : wallet.publicKey})
			if(preResponse.data.response===false){
				throw new Error("Nonce Error")
			}
			let nonce = preResponse.data.nonce
			let message = `Withdraw Request : ${nonce}`
			const data = new TextEncoder().encode(message)
			const signature = bs58.encode(await wallet.signMessage(data))
			openNotification('info', "Transaction Sent")
			let response = await axios.post(SEVERURL+"rpsgame/withdraw",{wallet : wallet.publicKey, amount : Number(inputAmount)*LAMPORTS_PER_SOL, signature : signature})
			if(response.data.response===true){
				openNotification('success', "Withdraw Success")
			}else{
				openNotification('error', "Withdraw Failed")
			}
			getSolAmountInfo()
		}catch(err){
			openNotification('error', "Withdraw Failed")
		}
		setIsWaiting(false)
	}

    const openNotification = (type : 'success' | 'error' | 'info' | 'warning', title : string, description? : string) => {
		notification[type]({
			message : title, description : description, placement : 'topLeft'
		})
	}

    return <>
		<button className='btn-setting' onClick={()=>{
			setOpenSettingPanel(true)
		}}>ATM : <span>{depositAmountStr}  SOL</span></button>
        <Drawer anchor="right" open={openSettingPanel} 
			sx={{minWidth:300 ,width: "10%", textAlign : "center",'& .MuiDrawer-paper':{borderRadius:"20px 0 0 20px", minWidth:300, width:"35%", backgroundColor:"#FFF"}}}
			onClose={(event)=>{setOpenSettingPanel(false)}}>
			<DrawerHeader>
				<IconButton onClick={(event)=>{setOpenSettingPanel(false)}}><ChevronRightIcon/></IconButton>
			</DrawerHeader>
			<h4 className='setting-panel-title p-3 pb-1'>ACCESS YOUR WALLET</h4>
			<div className='p-3 pb-4 pt-1'><WalletMultiButton/></div>
			<div className='row setting-main'>
				<div className='col-lg-6 setting-one-panel left-one pb-2'>
					<h5 className='setting-panel-subtitle pb-1'>WALLET</h5>
					<button className='amount-item'>{walletAmountStr} SOL</button>
				</div>
				<div className='col-lg-6 setting-one-panel right-one'>
					<h5 className='setting-panel-subtitle pb-1'>ATM</h5>
					<button className='amount-item'>{depositAmountStr} SOL</button>
				</div>
			</div>
			<h4 className='setting-panel-title pt-5 pb-1'>MANAGE FUNDS</h4>
			<div className='pb-2'>
			<input className='setting-input' name="inputAmount" type="number" placeholder="0.0" value={inputAmount} onChange={(event)=>{
					setInputAmount(event.target.value)
			}}></input>
			</div>
			<div className='row setting-main'>
				<div className='col-lg-6 setting-one-panel left-one pb-2'>
					<button className="setting-deposit-button" onClick={async()=>{
						if(isWaiting){
							openNotification('warning', "Please wait until confirming previous request")
							return;
						}
						await depositSol()
						await getSolAmountInfo()
					}}>DEPOSIT</button>
				</div>
				<div className='col-lg-6 setting-one-panel right-one'>
					<button className="setting-withdraw-button" onClick={async()=>{
						if(isWaiting){
							openNotification('warning', "Please wait until confirming previous request")
							return;
						}
						await withdrawSol()
						await getSolAmountInfo()
					}}>WITHDRAW</button>
				</div>
			</div>
		</Drawer>
    </>
}