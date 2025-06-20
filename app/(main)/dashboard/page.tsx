"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, ArrowRight, CheckCircle, Clock, PlusCircle, ShoppingCart, WalletIcon } from "lucide-react"
import type {
  Profile as ProfileRow,
  Wallet as WalletType,
  Transaction as TransactionType,
  KycRequest,
} from "@/types/supabase"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/client"

// Helper function to format currency
const formatCurrency = (amount: number | undefined | null, currency: string) => {
  if (amount === null || amount === undefined) return "N/A"
  const numericAmount = typeof amount === "string" ? Number.parseFloat(amount) : amount
  if (isNaN(numericAmount)) return "N/A"
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(numericAmount)
}

export default function DashboardPage() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [wallets, setWallets] = useState<WalletType[]>([])
  const [transactions, setTransactions] = useState<TransactionType[]>([])
  const [kycRequest, setKycRequest] = useState<Pick<KycRequest, "status"> | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUserId(data.session?.user?.id ?? null)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!userId) return

    const supabase = createClient()
    const fetchData = async () => {
      try {
        const profileData = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", userId)
          .single<ProfileRow>()

        const walletsData = await supabase
          .from("wallets")
          .select("*")
          .eq("user_id", userId)
          .order("currency_code")
          .returns<WalletType[]>()

        const transactionsData = await supabase
          .from("transactions")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(5)
          .returns<TransactionType[]>()

        const kycRequestData = await supabase
          .from("kyc_requests")
          .select("status")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle<Pick<KycRequest, "status">>()

        setProfile(profileData.data ?? null)
        setWallets(walletsData.data ?? [])
        setTransactions(transactionsData.data ?? [])
        setKycRequest(kycRequestData.data ?? null)
      } catch (error) {
        console.error("Error fetching data:", error)
      }
    }

    fetchData()
  }, [userId])

  const kycStatus = kycRequest?.status || "pending_submission"
  const isKycApproved = kycStatus === "approved"

  const availableCurrencies = ["NGN", "USD", "CAD", "GBP", "EUR"]
  const displayWallets = availableCurrencies.map((currency) => {
    const existingWallet = (wallets || []).find((w) => w.currency_code === currency)
    return (
      existingWallet || {
        id: `${currency}-placeholder-${userId}`,
        user_id: userId,
        currency_code: currency,
        balance: 0,
        locked_balance: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    )
  })

  // Add this function to launch Sumsub KYC and notify admin
  async function handleStartKyc(userId: string) {
    const supabase = createClient();
    // 1. Check for existing KYC request
    const { data: existing, error: fetchError } = await supabase
      .from("kyc_requests")
      .select("id, status")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (fetchError) {
      alert("Error checking KYC status. Please try again.");
      return;
    }
    if (existing && ["pending_review", "approved", "pending_submission"].includes(existing.status)) {
      alert("You already have a KYC request in progress or approved.");
      return;
    }
    let dbError = null;
    if (existing && existing.status === "rejected") {
      const { error: updateError } = await supabase
        .from("kyc_requests")
        .update({ status: "pending_review" })
        .eq("id", existing.id);
      dbError = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("kyc_requests")
        .insert({ user_id: userId, status: "pending_review" });
      dbError = insertError;
    }
    if (dbError) {
      alert("Failed to create or update KYC request: " + dbError.message);
      return;
    }
    // Prompt user for phone number
    const phone = prompt("Please enter your phone number for KYC verification:");
    if (!phone) {
      alert("Phone number is required for KYC.");
      return;
    }
    // 3. Fetch Sumsub token from your API
    let res;
    try {
      res = await fetch("https://kwegofx.com/api/kyc/sumsub-token.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          externalUserId: userId,
          email: session?.user?.email,
          phone,
          levelName: "Verify"
        }),
      });
    } catch (err) {
      alert("Could not reach KYC API endpoint. If you are running a static export, this endpoint will not be available. Please deploy your API route or use a serverless backend.");
      return;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Failed to start KYC. API route not found or error occurred.");
      return;
    }
    const { token } = await res.json();
    // 4. Load Sumsub SDK and launch
    function loadSumsubSdk(callback: () => void) {
      if (window.SUMSUBKYC) return callback();
      const script = document.createElement("script");
      script.src = "https://static.sumsub.com/idensic/static/sumsub-kyc-sdk-1.0.0.js";
      script.async = true;
      script.onload = callback;
      document.body.appendChild(script);
    }
    loadSumsubSdk(() => {
      window.SUMSUBKYC.init({
        lang: "en",
        accessToken: token,
        onMessage: (type: string, payload: any) => {},
        onError: (error: any) => { alert("KYC error: " + error.message); },
      }).launch("#sumsub-kyc-container");
    });
  }

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>
  }

  if (!session) {
    if (typeof window !== "undefined") {
      window.location.href = "/login?message=Please log in to view the dashboard."
    }
    return null
  }

  return (
    <div className="flex min-h-screen flex-col bg-belfx_navy-light text-white">
      <header className="bg-belfx_navy-DEFAULT shadow-md">
        <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <img src="/images/belfx-logo-dark.png" alt="BELFX Logo" className="h-8" />
            <span className="text-xl font-semibold text-gray-200 hidden sm:inline">Dashboard</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-300 hidden md:inline">
              Welcome, {profile?.full_name || session?.user?.email}
            </span>
            <Button
              variant="outline"
              className="text-belfx_gold-DEFAULT border-belfx_gold-DEFAULT hover:bg-belfx_gold-DEFAULT hover:text-belfx_navy-DEFAULT"
              onClick={() => {
                const supabase = createClient()
                supabase.auth.signOut().then(() => {
                  window.location.href = "/login?message=You have been logged out."
                })
              }}
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 container mx-auto">
        {/* KYC Banner */}
        {!isKycApproved && (
          <Card className="mb-6 bg-yellow-500/10 border-yellow-500/50 text-yellow-200">
            <CardHeader className="pb-3 pt-4">
              <CardTitle className="flex items-center text-lg">
                <AlertCircle className="mr-2 h-5 w-5 text-yellow-400" />
                KYC Verification Required
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <p className="text-sm mb-3">
                {kycStatus === "pending_review"
                  ? "Your KYC documents are under review. We'll notify you once completed."
                  : kycStatus === "rejected"
                    ? "Your KYC verification was rejected. Please check your email or notifications for details and resubmit."
                    : "Please complete your KYC verification to access all platform features, including trading and withdrawals."}
              </p>
              {kycStatus !== "pending_review" && (
                <Button
                  size="sm"
                  className="bg-yellow-400 text-belfx_navy-DEFAULT hover:bg-yellow-300"
                  onClick={() => userId && handleStartKyc(userId)}
                >
                  {kycStatus === "rejected" ? "Resubmit KYC" : "Complete KYC Now"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-100 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link href="/marketplace/create-offer">
              <Button
                variant="outline"
                className="w-full justify-start text-left h-auto py-3 bg-belfx_navy-DEFAULT border-belfx_green-DEFAULT/50 hover:bg-belfx_navy-light hover:border-belfx_green-DEFAULT disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!isKycApproved}
                aria-disabled={!isKycApproved}
                title={!isKycApproved ? "Complete KYC to create offers" : "Create a new P2P offer"}
              >
                <PlusCircle className="mr-3 h-6 w-6 text-belfx_green-DEFAULT" />
                <div>
                  <p className="font-semibold text-gray-100">Create New Offer</p>
                  <p className="text-xs text-gray-400">Post a buy or sell offer on the marketplace.</p>
                </div>
              </Button>
            </Link>
            <Link href="/marketplace">
              <Button
                variant="outline"
                className="w-full justify-start text-left h-auto py-3 bg-belfx_navy-DEFAULT border-belfx_gold-DEFAULT/50 hover:bg-belfx_navy-light hover:border-belfx_gold-DEFAULT"
              >
                <ShoppingCart className="mr-3 h-6 w-6 text-belfx_gold-DEFAULT" />
                <div>
                  <p className="font-semibold text-gray-100">View Marketplace</p>
                  <p className="text-xs text-gray-400">Browse existing P2P offers.</p>
                </div>
              </Button>
            </Link>
            <Link href="/wallets">
              <Button
                variant="outline"
                className="w-full justify-start text-left h-auto py-3 bg-belfx_navy-DEFAULT border-blue-500/50 hover:bg-belfx_navy-light hover:border-blue-400"
              >
                <WalletIcon className="mr-3 h-6 w-6 text-blue-400" />
                <div>
                  <p className="font-semibold text-gray-100">Manage Wallets</p>
                  <p className="text-xs text-gray-400">Deposit, withdraw, and view balances.</p>
                </div>
              </Button>
            </Link>
          </div>
        </section>

        {/* Wallet Overview */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-100 mb-4">Wallet Overview</h2>
          {!displayWallets.length && (
            <p className="text-gray-400">No wallets found. Wallets will be created upon first deposit.</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayWallets.map((wallet) => (
              <Card key={wallet.id} className="bg-belfx_navy-DEFAULT shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl text-belfx_gold-DEFAULT">{wallet.currency_code}</CardTitle>
                  <CardDescription className="text-gray-400">
                    Available:{" "}
                    {formatCurrency(Number(wallet.balance) - Number(wallet.locked_balance), wallet.currency_code)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-gray-100 mb-1">
                    {formatCurrency(Number(wallet.balance), wallet.currency_code)}
                  </p>
                  <p className="text-xs text-gray-500 mb-4">
                    Locked: {formatCurrency(Number(wallet.locked_balance), wallet.currency_code)}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-belfx_green-DEFAULT border-belfx_green-DEFAULT hover:bg-belfx_green-DEFAULT hover:text-belfx_navy-DEFAULT flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!isKycApproved}
                      aria-disabled={!isKycApproved}
                      title={!isKycApproved ? "Complete KYC to deposit" : "Deposit funds"}
                    >
                      Deposit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-400 border-red-400 hover:bg-red-400 hover:text-belfx_navy-DEFAULT flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!isKycApproved}
                      aria-disabled={!isKycApproved}
                      title={!isKycApproved ? "Complete KYC to withdraw" : "Withdraw funds"}
                    >
                      Withdraw
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Recent Activity */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-100 mb-4">Recent Activity</h2>
          <Card className="bg-belfx_navy-DEFAULT shadow-lg">
            <CardContent className="p-0">
              {!transactions.length && (
                <p className="text-gray-400 p-6 text-center">No recent transactions found.</p>
              )}
              {transactions && transactions.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-belfx_navy-light hover:bg-belfx_navy-DEFAULT">
                      <TableHead className="text-gray-300">Date</TableHead>
                      <TableHead className="text-gray-300">Type</TableHead>
                      <TableHead className="text-gray-300">Amount</TableHead>
                      <TableHead className="text-gray-300">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id} className="border-b-belfx_navy-light hover:bg-belfx_navy-light/30">
                        <TableCell className="text-gray-400 text-sm">
                          {format(new Date(tx.created_at), "MMM dd, yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="capitalize text-gray-200">
                          {tx.type?.replace(/_/g, " ") || "N/A"}
                        </TableCell>
                        <TableCell
                          className={`${
                            tx.type?.includes("sell") || tx.type?.includes("withdrawal")
                              ? "text-red-400"
                              : "text-belfx_green-DEFAULT"
                          } font-medium`}
                        >
                          {formatCurrency(tx.amount, tx.currency_code)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              tx.status === "completed"
                                ? "default"
                                : tx.status === "pending"
                                  ? "secondary"
                                  : "destructive"
                            }
                            className={`capitalize 
                            ${
                              tx.status === "completed"
                                ? "bg-belfx_green-DEFAULT text-belfx_navy-DEFAULT"
                                : tx.status === "pending"
                                  ? "bg-blue-500 text-white"
                                  : "bg-red-500 text-white"
                            }`}
                          >
                            {tx.status === "completed" && <CheckCircle className="mr-1 h-3 w-3 inline-block" />}
                            {tx.status === "pending" && <Clock className="mr-1 h-3 w-3 inline-block" />}
                            {(tx.status === "failed" || tx.status === "cancelled") && (
                              <AlertCircle className="mr-1 h-3 w-3 inline-block" />
                            )}
                            {tx.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
            {transactions && transactions.length > 0 && (
              <CardHeader className="pt-3 pb-4 text-center border-t border-belfx_navy-light mt-1">
                <Link href="/transactions">
                  <Button variant="link" className="text-belfx_gold-DEFAULT">
                    View All Transactions <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardHeader>
            )}
          </Card>
        </section>
        <div id="sumsub-kyc-container"></div>
      </main>
    </div>
  )
}
