/*  Marcion
    Copyright (C) 2009-2016 Milan Konvicka

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License along
    with this program; if not, write to the Free Software Foundation, Inc.,
    51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA. */

#include "mexecsql.h"
#include "ui_mexecsql.h"

MExecSql::MExecSql(CMessages * const messages,
                   QWidget *parent) :
    QWidget(parent),
    ui(new Ui::MExecSql),
    messages(messages),
    popup()
{
    ui->setupUi(this);

    a_check=popup.addAction(tr("check"));
    a_repair=popup.addAction(tr("repair"));
    popup.addSeparator();
    a_refresh=popup.addAction(QIcon(":/new/icons/icons/refresh.png"),tr("refresh"));
    a_check_all=popup.addAction(tr("check all"));
    popup.addSeparator();
    a_export=popup.addAction(tr("export"));
    a_export->setEnabled(false);
    popup.addSeparator();
    a_trunc=popup.addAction(tr("truncate"));
    a_drop=popup.addAction(tr("drop"));

    ui->treeTables->header()->setResizeMode(QHeaderView::ResizeToContents);

    readTables(false);


    adjustSize();

    ui->splitter->setStretchFactor(0,0);
    ui->splitter->setStretchFactor(1,1);

    QList<int> li;
    li << 1 << 1;
    ui->splitter->setSizes(li);

    IC_SIZES
}

MExecSql::~MExecSql()
{
    delete ui;
}

void MExecSql::on_btExecute_clicked()
{
    USE_CLEAN_WAIT
    QString query(ui->txtSql->toPlainText());
    ui->histHist->append(query);

    CMySql q(query);
    if(!q.exec())
    {
      ui->txtOutput->append(q.lastError()+"\n");
      return;
    }

    ui->txtOutput->appendPlain(tr("result of '")+query+"':");
    if(q.hasResult())
    {
        unsigned int rows=q.size(),fields=q.fieldCount();
        QString result(tr("fields: ")+QString::number(fields)+tr(", rows: ")+QString::number(rows)+"\n\n");

        if(fields>0)
        {
            QString field_name,flds(tr("fields:\n| "));
            while(!(field_name=q.fieldName()).isEmpty())
                flds.append(field_name+" | ");
            flds.chop(1);
            result.append(flds+tr("\nrows:\n"));

            while(q.next())
            {
                QString row("| ");
                for(unsigned int x=0;x<fields;x++)
                {
                    if(q.isNULL(x))
                        row.append("NULL | ");
                    else
                        row.append(q.value(x)+" | ");
                }
                row.chop(1);
                result.append(row+"\n");
            }
            ui->txtOutput->appendPlain(result+tr("\nend of result\n\n"));
        }
        else
            ui->txtOutput->appendPlain(tr("no fields\n"));
    }
    else
        ui->txtOutput->appendPlain(tr("no result\n"));

    ui->txtOutput->goToBottom();
}

void MExecSql::on_btClose_clicked()
{
    close();
}

void MExecSql::on_btClear_clicked()
{
    ui->txtOutput->clear();
}

void MExecSql::on_btClearSql_clicked()
{
    ui->txtSql->clear();
}

void MExecSql::on_histHist_buttonClicked(int index)
{
    ui->txtSql->setText(ui->histHist->text(index));
}

void MExecSql::on_btAction_clicked(bool checked)
{
    if(checked)
    {
        popup.setButton(ui->btAction);
        on_treeTables_customContextMenuRequested(QPoint());
    }
}

void MExecSql::on_treeTables_customContextMenuRequested(QPoint )
{
    MTblItem * item((MTblItem *)ui->treeTables->currentItem());

    a_check->setEnabled(item);
    a_trunc->setEnabled(item&&m_sett()->isCopticEditable());
    a_drop->setEnabled(item&&m_sett()->isCopticEditable());
    a_repair->setEnabled(item);

    popup.setActiveAction(a_check);
    QAction *a=popup.exec();
    if(a)
    {
        if(a==a_refresh)
            readTables(false);
        else if(a==a_check)
            checkTable(item);
        else if(a==a_check_all)
            readTables(true);
        else if(a==a_trunc)
            truncateTable(item);
        else if(a==a_drop)
            dropTable(item);
        else if(a==a_repair)
            repairTable(item);
        else if(a==a_export)
            exportTable(item);
    }
}

void MExecSql::readTables(bool check)
{
    USE_CLEAN_WAIT
    ui->treeTables->clear();

    QString query("show tables");
    MQUERY(q,query);

    while(q.next())
    {
        MTblItem * i=new MTblItem();
        i->_tbl=q.value(0);

        if(check)
            checkTable(i);
        else
        {
            i->_records=i->_msg=QString("???");
            i->setText();
        }

        ui->treeTables->addTopLevelItem(i);
    }

    m_msg()->MsgOk();
}

void MExecSql::checkTable(MTblItem * item)
{
    if(item)
    {
        USE_CLEAN_WAIT
        QString const query("check table `"+item->_tbl+"`"),
        query2("select count(*) from `"+item->_tbl+"`");
        MQUERY_GETFIRST(q,query)
        item->_msg=q.value(3);
        MQUERY_GETFIRST(q2,query2)
        item->_records=q2.value(0);
        item->setText();

        m_msg()->MsgOk();
    }
}

void MExecSql::repairTable(MTblItem * item)
{
    if(item)
    {
        USE_CLEAN_WAIT
        QString query("repair table `"+item->_tbl+"`");
        MQUERY_GETFIRST(q,query)

        checkTable(item);

        m_msg()->MsgOk();
    }
}

void MExecSql::truncateTable(MTblItem * item)
{
    if(item)
    {
        QMessageBox mb(QMessageBox::Question,tr("truncate table"),tr("Table '")+item->_tbl+tr("' will be truncated. Continue?"),QMessageBox::Yes|QMessageBox::No,this);
        if(mb.exec()==QMessageBox::Yes)
        {
            USE_CLEAN_WAIT
            QString query("truncate table `"+item->_tbl+"`");
            MQUERY(q,query)

            checkTable(item);

            m_msg()->MsgOk();
        }
    }
}

void MExecSql::dropTable(MTblItem * item)
{
    if(item)
    {
        QMessageBox mb(QMessageBox::Question,tr("drop table"),tr("Table '")+item->_tbl+tr("' will be dropped. Continue?"),QMessageBox::Yes|QMessageBox::No,this);
        if(mb.exec()==QMessageBox::Yes)
        {
            USE_CLEAN_WAIT
            QString query("drop table `"+item->_tbl+"`");
            MQUERY(q,query)

            ui->treeTables->takeTopLevelItem(ui->treeTables->indexOfTopLevelItem(item));

            m_msg()->MsgOk();
        }
    }
}

void MExecSql::exportTable(MTblItem * )
{
    /*if(item)
    {
        USE_CLEAN_WAIT

        QMessageBox mb(QMessageBox::Question,tr("export table"),tr("exporting table `")+item->_tbl+tr("` ...\nContinue?"),QMessageBox::Yes|QMessageBox::No,this);
        if(mb.exec()==QMessageBox::Yes)
        {
            QString const fname(m_sett()->marcDir+"/data/backup/"+item->_tbl+".csv");
            QString const query("select * into outfile '"+fname+"' character set utf8 fields escaped by '\\\\' fields enclosed by '\\\"' fields terminated by ';' lines terminated by '\\n' from `"+item->_tbl+"`");
            MQUERY(q,query)
            m_msg()->MsgInf(tr("table `")+item->_tbl+tr("` was successfully exported into file '")+fname+"'");
        }
    }*/
}

// MTblItem

MTblItem::MTblItem() :
    QTreeWidgetItem(QTreeWidgetItem::UserType),
    _tbl(),
    _msg(),
    _records()
{

}

void MTblItem::setText()
{
    QTreeWidgetItem::setText(0,_tbl);
    QTreeWidgetItem::setText(1,_msg);
    QTreeWidgetItem::setText(2,_records);
}
