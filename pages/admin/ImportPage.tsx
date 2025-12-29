
import React, { useState } from 'react';
import { db } from '../../db';
import { RefreshCcw, FileUp, CheckCircle, AlertCircle } from 'lucide-react';

const ImportPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<{ type: 'info' | 'error', msg: string }[]>([]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e