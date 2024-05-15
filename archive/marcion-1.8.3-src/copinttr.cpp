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

#include "copinttr.h"
#include "ui_copinttr.h"

CCopIntTr::CCopIntTr(CMessages * const messages,QWidget *parent) :
    QWidget(parent),
    ui(new Ui::CCopIntTr),
    messages(messages),
    popup(),popup_grp(),
    last_wid(),last_eqid(),last_grid(),last_crumid(),
    cop_font(),lat_font()
{
    ui->setupUi(this);

    a_delete=popup.addAction(tr("delete"));
    a_grp_imp_cont=popup_grp.addAction(tr("import data"));
    a_grp_entire=popup_grp.addAction(tr("show all subitems"));
    popup_grp.addSeparator();
    a_grp_delete=popup_grp.addAction(tr("delete all"));
    a_grp_del=popup_grp.addAction(tr("delete word"));
    a_grp_delw=popup_grp.addAction(tr("delete words"));
    a_grp_dele=popup_grp.addAction(tr("delete equivs"));

    cop_font=messages->settings().font(CTranslit::Copt);
    cop_font.setPointSize(messages->settings().fontSize(CTranslit::Copt));
    lat_font=messages->settings().font(CTranslit::Latin);
    lat_font.setPointSize(messages->settings().fontSize(CTranslit::Latin));

    connect(&messages->settings(),SIGNAL(fontChanged(CTranslit::Script, QFont)),this,SLOT(settings_fontChanged(CTranslit::Script, QFont)));

    settings_fontChanged(CTranslit::Copt,cop_font);
    settings_fontChanged(CTranslit::Latin,lat_font);

    on_rbCop_toggled(true);
    ui->trWord->setVAsPreferred();
    ui->trWord->setSwitchState(true);
    ui->trWord->setSwitch(true);

    ui->treeGroup->hideColumn(1);
    ui->treeGroup->hideColumn(2);
    ui->treeGroup->hideColumn(3);

    ui->treeOut->hideColumn(2);

    if(!ui->cbCz->isChecked())
        ui->treeOut->hideColumn(1);

    ui->wdgUpd->setEnabled(false);

    ui->wdgUpdGrp->setEnabled(false);
    ui->wdgUpd->setEnabled(false);
    ui->wdgNew->setEnabled(false);
    ui->wdgUpdEqv->setEnabled(false);
    ui->wdgNewEqv->setEnabled(false);

    ui->tboxOps->setCurrentIndex(3);

    ui->stwTrees->setCurrentIndex(1);

    IC_SIZES
}

CCopIntTr::~CCopIntTr()
{
    delete ui;
}

void CCopIntTr::changeEvent(QEvent *e)
{
    QWidget::changeEvent(e);
    switch (e->type()) {
    case QEvent::LanguageChange:
        ui->retranslateUi(this);
        break;
    default:
        break;
    }
}

void CCopIntTr::on_rbCop_toggled(bool checked)
{
    if(checked)
    {
        ui->trWord->setScript(CTranslit::Copt);
        //ui->trWord->setTr(CTranslit::CopticTrToCopticN);
    }
}

void CCopIntTr::on_rbEn_toggled(bool checked)
{
    if(checked)
    {
        ui->trWord->setScript(CTranslit::Latin);
        //ui->trWord->setTr(CTranslit::LatinTrToLatinN);
    }
}

void CCopIntTr::on_rbCz_toggled(bool checked)
{
    if(checked)
    {
        //ui->trWord->setFont(lat_font);
        ui->trWord->setScript(CTranslit::Latin);
        //ui->trWord->setTr(CTranslit::LatinTrToLatinN);
    }
}

void CCopIntTr::on_btQuery_clicked()
{
    QString whcl,gk;
    if(!ui->cbQGreek->isChecked())
        gk=" and `name` not regexp '^\\\\(gk\\\\)'";

    if(ui->rbCop->isChecked())
    {
        if(ui->rbQGrp->isChecked())
        {
            whcl="where `name` regexp '"+ui->trWord->text().trimmed()+"'"+gk;
            execQuery(whcl);
        }
        else
        {
            whcl="where `word` regexp '"+ui->trWord->text().trimmed()+"'"+gk;
            execQuery(whcl);
        }
    }
    else if(ui->rbEn->isChecked())
    {
        whcl="where `en_eqv` regexp '"+ui->trWord->text().trimmed()+"'";
        execQuery3(whcl);
    }
    else if(ui->rbCz->isChecked())
    {
        whcl="where `cz_eqv` regexp '"+ui->trWord->text().trimmed()+"'";
        execQuery3(whcl);
    }

    ui->trWord->updateHistory();
}

void CCopIntTr::on_btNew_clicked()
{
    if(!last_grid.isEmpty())
    {
        QString query("insert into `cop_transl` (`word`,`key_group`) values ('<word>',<grpid>)");

        query.replace("<word>",ui->txtNewWord->text().trimmed());
        query.replace("<grpid>",last_grid);
        MQUERY(q,query)
        //messages->MsgInf("item added",this);
        messages->MsgOk();

        ui->txtNewWord->clear();

        execQuery(QString("where `cop_transl`.`key`=last_insert_id()"));
    }
}

void CCopIntTr::execQuery(QString const & where)
{
    USE_CLEAN_WAIT

    clearTrees();

    QString query("select `cop_grp_transl`.`key`,`name`,if(`crum_table`=3,concat('3-',`grammar`),concat(`crum_table`,'-',`crum_id`)),`cop_transl`.`key`,`word` from `cop_grp_transl` left outer join `cop_transl` on `cop_grp_transl`.`key`=`cop_transl`.`key_group` <where> order by `name`");

    query.replace("<where>",where);
    MQUERY(q,query)

    int lastid(0);
    QTreeWidgetItem * lastti(0);
    while(q.next())
    {
        QString curids(q.value(0));
        int curid(curids.toInt());
        QTreeWidgetItem * wi=new QTreeWidgetItem(0);

        if(lastid!=curid)
        {
            QString copnat(q.value(1)),copwnat(q.value(4));
            wi->setText(1,curids);
            wi->setText(2,q.value(2));
            wi->setText(0,CTranslit::to(copnat,CTranslit::Copt,false));
            wi->setFont(0,cop_font);
            wi->setText(3,copnat);

            ui->treeGroup->addTopLevelItem(wi);
            QTreeWidgetItem * wi2=new QTreeWidgetItem(0);

            if(!q.isNULL(4))
            {
                wi2->setText(0,CTranslit::tr(copwnat,CTranslit::CopticTrToCopticN,false,CTranslit::RemoveNone));
                wi2->setFont(0,cop_font);
                wi2->setText(3,copwnat);
                wi2->setText(1,q.value(3));

                lastti=wi;
                lastti->addChild(wi2);
            }
        }
        else
        {
            QString copnat(q.value(4));
            wi->setText(0,CTranslit::tr(copnat,CTranslit::CopticTrToCopticN,false,CTranslit::RemoveNone));
            wi->setFont(0,cop_font);
            wi->setText(3,copnat);
            wi->setText(1,q.value(3));

            lastti->addChild(wi);
        }

        lastid=curid;
    }


    messages->MsgOk();

    /*if(ui->treeGroup->topLevelItemCount()>0)
        ui->treeGroup->topLevelItem(0)->setSelected(true);*/

}

void CCopIntTr::execQuery2(QString const & where)
{
    USE_CLEAN_WAIT

    ui->treeOut->setColumnHidden(1,!ui->cbCz->isChecked());
    ui->treeOut->clear();
    QString query("select `key`,`en_eqv`,`cz_eqv` from `cop_encz_transl` <where> order by `en_eqv`");

    query.replace("<where>",where);
    MQUERY(q,query)

    QRegExp r(ui->trWord->text());
    QFont mf(lat_font);
    mf.setBold(true);

    while(q.next())
    {
        QTreeWidgetItem * wi=new QTreeWidgetItem(0);

        QString enw(q.value(1)),czw(q.value(2));
        wi->setText(2,q.value(0));
        wi->setText(0,enw);
        wi->setFont(0,lat_font);
        wi->setText(1,czw);
        wi->setFont(1,lat_font);

        if(ui->rbEn->isChecked())
        {
            if(r.indexIn(enw)!=-1)
            {
                wi->setBackgroundColor(0,QColor("#FFFF99"));
                wi->setFont(0,mf);
            }
        }
        else if(ui->rbCz->isChecked())
        {
            if(r.indexIn(czw)!=-1)
            {
                wi->setBackgroundColor(1,QColor("#FFFF99"));
                wi->setFont(1,mf);
            }
        }

        ui->treeOut->addTopLevelItem(wi);
    }


    messages->MsgOk();

    /*if(ui->treeOut->topLevelItemCount()>0)
        ui->treeOut->topLevelItem(0)->setSelected(true);*/
}

void CCopIntTr::execQuery3(QString const & where)
{
    USE_CLEAN_WAIT

    clearTrees();

    QString query("select distinct `cop_grp_transl`.`key`,`name`,concat(`crum_table`,'-',`crum_id`) from `cop_grp_transl` inner join `cop_encz_transl` on `cop_grp_transl`.`key`=`cop_encz_transl`.`key_group` <where> order by `name`");
    query.replace("<where>",where);

    MQUERY(q,query)

    while(q.next())
    {
        QTreeWidgetItem * wi=new QTreeWidgetItem();

        QString copnat(q.value(1));
        wi->setText(1,q.value(0));
        wi->setText(2,q.value(2));
        wi->setText(0,CTranslit::to(copnat,CTranslit::Copt,false));
        wi->setFont(0,cop_font);
        wi->setText(3,copnat);

        ui->treeGroup->addTopLevelItem(wi);
    }

    messages->MsgOk();


    /*if(ui->treeGroup->topLevelItemCount()>0)
        ui->treeGroup->topLevelItem(0)->setSelected(true);*/
}

void CCopIntTr::on_treeOut_itemSelectionChanged()
{
    if(ui->treeOut->selectedItems().count()>0)
    {
        ui->treeGroup->clearSelection();
        QTreeWidgetItem * i=ui->treeOut->selectedItems().first();

        ui->wdgUpdGrp->setEnabled(false);
        ui->wdgUpd->setEnabled(false);
        ui->wdgNew->setEnabled(false);
        ui->wdgNewEqv->setEnabled(false);
        ui->wdgUpdEqv->setEnabled(true);

        ui->cbEngUpd->setChecked(false);
        ui->cbCzechUpd->setChecked(false);
        ui->txtEnglishUpd->setText(i->text(0));
        ui->txtCzechUpd->setText(i->text(1));
        on_cbEngUpd_clicked(false);
        on_cbCzechUpd_clicked(false);

        ui->tboxOps->setCurrentIndex(2);
        last_eqid=i->text(2);
        last_grid=last_wid=QString();
    }
}

void CCopIntTr::on_btUpdWord_clicked()
{
    if(!last_wid.isEmpty())
    {
        QString query("update `cop_transl` set ");
        if(ui->cbUpdWord->isChecked())
            query.append("`word`='"+ui->txtUpdWord->text()+"',");
        query.chop(1);
        query.append(" where `cop_transl`.`key`="+last_wid);
        MQUERY(q,query)
        //messages->MsgInf("item updated",this);
        messages->MsgOk();

        ui->txtUpdWord->clear();
        execQuery("where `cop_transl`.`key`="+last_wid);
    }
}

void CCopIntTr::on_cbUpdWord_clicked(bool checked)
{
    ui->txtUpdWord->setEnabled(checked);
}

void CCopIntTr::on_cbUpdCrumId_clicked(bool checked)
{
    ui->txtUpdCrumId->setEnabled(checked);
}

void CCopIntTr::on_btNewEqv_clicked()
{
    if(!last_grid.isEmpty())
    {
        QString query("insert into `cop_encz_transl` (`en_eqv`,`cz_eqv`,`key_group`) values ('<en>','<cz>',<gkey>)");

        query.replace("<en>",ui->txtEnglish->text().trimmed());
        query.replace("<cz>",ui->txtCzech->text().trimmed());
        query.replace("<gkey>",last_grid);
        MQUERY(q,query)
        //messages->MsgInf("item added",this);
        messages->MsgOk();

        //ui->txtEnglish->clear();
        //ui->txtCzech->clear();

        execQuery(QString("where `cop_grp_transl`.`key`="+last_grid));
    }
}

void CCopIntTr::on_cbCzechUpd_clicked(bool checked)
{
    ui->txtCzechUpd->setEnabled(checked);
}

void CCopIntTr::on_cbEngUpd_clicked(bool checked)
{
    ui->txtEnglishUpd->setEnabled(checked);
}

void CCopIntTr::on_btShowAll_clicked()
{
    QString wh;
    if(!ui->cbQGreek->isChecked())
        wh="where `name` not regexp '^\\\\(gk\\\\)'";;
    execQuery(wh);
}

void CCopIntTr::on_btUpdEqv_clicked()
{
    if(!last_eqid.isEmpty())
    {
        QString query("update `cop_encz_transl` set ");
        if(ui->cbEngUpd->isChecked())
            query.append("`en_eqv`='"+ui->txtEnglishUpd->text()+"',");
        if(ui->cbCzechUpd->isChecked())
            query.append("`cz_eqv`='"+ui->txtCzechUpd->text()+"',");
        query.chop(1);
        query.append(" where `cop_encz_transl`.`key`="+last_eqid);
        MQUERY(q,query)
        //messages->MsgInf("item updated",this);
        messages->MsgOk();

        ui->txtCzechUpd->clear();
        ui->txtEnglishUpd->clear();
        execQuery("where `cop_grp_transl`.`key`=(select `key_group` from `cop_encz_transl` where `key`="+last_eqid+")");
    }
}

void CCopIntTr::on_treeOut_customContextMenuRequested(QPoint )
{
    QAction * a=popup.exec(QCursor::pos());
    if(a==a_delete)
        deleteItem();
}

void CCopIntTr::deleteItem()
{
    //messages->MsgMsg("xxx");
    if(!last_eqid.isEmpty())
    {
        //QTreeWidgetItem * i=ui->treeOut->selectedItems().first();

        QString query2("set @deleted_grp_id=(select `key_group` from `cop_encz_transl` where `key`="+last_eqid+")");
        MQUERY(q2,query2)

        QString query("delete from `cop_encz_transl` where `key`="+last_eqid);
        MQUERY(q,query)
        messages->MsgOk();

        execQuery("where `cop_grp_transl`.`key`=@deleted_grp_id");
    }
}

void CCopIntTr::deleteGrpItem(int items)
{
    if(!last_wid.isEmpty()&&items==Word)
    {
        if(QMessageBox(QMessageBox::Question,"delete item","deleting word ...\ncontinue?",QMessageBox::Yes|QMessageBox::No).exec()==QMessageBox::Yes)
        {
            QString query2("set @deleted_grp_id=(select `key_group` from `cop_transl` where `key`="+last_wid+")");
            MQUERY(q2,query2)

            QString query("delete from `cop_transl` where `key`="+last_wid);
            MQUERY(q,query)

            execQuery("where `cop_grp_transl`.`key`=@deleted_grp_id");
        }
    }
    else if(!last_grid.isEmpty()&&items!=Word)
    {
        if(QMessageBox(QMessageBox::Question,"delete item","deleting subitems ...\ncontinue?",QMessageBox::Yes|QMessageBox::No).exec()==QMessageBox::Yes)
        {
            QString dtbls;
            switch(items)
            {
            case All :
                dtbls="`cop_grp_transl`,`cop_transl`,`cop_encz_transl`";
                break;
            case Words :
                dtbls="`cop_transl`";
                break;
            case Equivs :
                dtbls="`cop_encz_transl`";
                break;
            }

            QString query("delete "+dtbls+" from `cop_grp_transl` left outer join `cop_transl` on `cop_grp_transl`.`key`=`cop_transl`.`key_group` left outer join `cop_encz_transl` on `cop_grp_transl`.`key`=`cop_encz_transl`.`key_group` where `cop_grp_transl`.`key`="+last_grid);
            MQUERY(q,query)

            execQuery("where `cop_grp_transl`.`key`="+last_grid);
        }
    }
}

void CCopIntTr::settings_fontChanged(CTranslit::Script uf, QFont f)
{
    QString s;

    switch(uf)
    {
        case CTranslit::Copt :
        {
            ui->trWord->refreshFonts();
            s=tr("Coptic");
            break;
        }
        case CTranslit::Latin :
        {
            ui->tboxOps->setFont(f);
            ui->trWord->refreshFonts();

            s=tr("Latin");
            break;
        }
        case CTranslit::Greek :
        {
            s=tr("Greek");
            break;
        }
        case CTranslit::Hebrew :
        {
            s=tr("Hebrew");
            break;
        }
    }
    messages->MsgMsg(windowTitle()+": "+s+tr(" font changed"));
}

void CCopIntTr::on_treeGroup_itemSelectionChanged()
{
    if(ui->treeGroup->selectedItems().count()>0)
    {
        ui->treeOut->clearSelection();
        QTreeWidgetItem * wi(ui->treeGroup->selectedItems().first());
        if(!wi->parent())
        {
            execQuery2("where `key_group`="+wi->text(1));
            ui->wdgUpdGrp->setEnabled(true);
            ui->wdgUpd->setEnabled(false);
            ui->wdgNew->setEnabled(true);
            ui->wdgUpdEqv->setEnabled(false);
            ui->wdgNewEqv->setEnabled(true);

            ui->cbUpdGrp->setChecked(false);
            ui->txtUpdGrp->setText(wi->text(3));
            ui->cbUpdCrumId->setChecked(false);
            ui->txtUpdCrumId->setText(wi->text(2));
            on_cbUpdGrp_clicked(false);
            on_cbUpdCrumId_clicked(false);

            last_grid=wi->text(1);
            last_crumid=wi->text(2);
            last_eqid=last_wid=QString();
            ui->tboxOps->setCurrentIndex(0);
        }
        else
        {
            ui->wdgUpdGrp->setEnabled(false);
            ui->wdgUpd->setEnabled(true);
            ui->wdgNew->setEnabled(false);
            ui->wdgUpdEqv->setEnabled(false);
            ui->wdgNewEqv->setEnabled(false);

            ui->cbUpdWord->setChecked(false);
            ui->txtUpdWord->setText(wi->text(3));
            on_cbUpdWord_clicked(false);

            last_wid=wi->text(1);
            last_eqid=last_grid=QString();

            ui->tboxOps->setCurrentIndex(1);
        }
    }
}

void CCopIntTr::on_cbCz_clicked(bool checked)
{
    ui->treeOut->setColumnHidden(1,!checked);
}

void CCopIntTr::on_btNewGrp_clicked()
{
    QString query("insert into `cop_grp_transl` (`name`,`crum_table`,`crum_id`,`grammar`) values ('<name>',<crumtbl>,<crumid>,'<grammar>')");

    QString cid(ui->txtNewCrumId->text().trimmed()),ctbl,grm;
    if(!cid.isEmpty())
    {
        ctbl=cid[0];
        cid.remove(0,2);
        if(ctbl=="3")
        {
            grm=cid;
            cid="NULL";
        }
        else if(!checkDupId(ctbl.toShort(),cid.toInt(),-1))
            return;
    }
    else
        ctbl=cid=grm="NULL";

    query.replace("<name>",ui->txtNewGrp->text().trimmed());
    query.replace("<crumtbl>",ctbl);
    query.replace("<crumid>",cid);
    query.replace("<grammar>",grm);
    MQUERY(q,query)
    //messages->MsgInf("item added",this);

    messages->MsgOk();

    //ui->txtNewGrp->clear();
    //ui->txtNewCrumId->clear();

    execQuery(QString("where `cop_grp_transl`.`key`=last_insert_id()"));
}

void CCopIntTr::on_btUpdGrp_clicked()
{
    if(!last_grid.isEmpty())
    {
        QString query("update `cop_grp_transl` set ");
        QString cid(ui->txtUpdCrumId->text()),grm,ctbl;

        if(!cid.isEmpty())
        {
            ctbl=cid[0];
            cid.remove(0,2);
            if(ctbl=="3")
            {
                grm=cid;
                cid="NULL";
            }
            else if(!checkDupId(ctbl.toShort(),cid.toInt(),last_grid.toInt()))
                return;
        }
        else
            ctbl=cid=grm="NULL";

        if(ui->cbUpdGrp->isChecked())
            query.append("`name`='"+ui->txtUpdGrp->text()+"',");
        if(ui->cbUpdCrumId->isChecked())
        {
            query.append("`crum_table`="+ctbl+",");
            query.append("`crum_id`="+cid+",");
            query.append("`grammar`='"+grm+"',");
        }
        query.chop(1);
        query.append(" where `cop_grp_transl`.`key`="+last_grid);
        MQUERY(q,query)
        //messages->MsgInf("item updated",this);
        messages->MsgOk();

        ui->txtUpdGrp->clear();
        ui->txtUpdCrumId->clear();
        execQuery("where `cop_grp_transl`.`key`="+last_grid);
    }
}

void CCopIntTr::on_cbUpdGrp_clicked(bool checked)
{
    ui->txtUpdGrp->setEnabled(checked);
}

void CCopIntTr::clearTrees()
{
    ui->treeGroup->clear();
    ui->treeOut->clear();

    ui->wdgUpdGrp->setEnabled(false);
    ui->wdgUpd->setEnabled(false);
    ui->wdgNew->setEnabled(false);
    ui->wdgUpdEqv->setEnabled(false);
    ui->wdgNewEqv->setEnabled(false);

    last_eqid=last_grid=last_wid=QString();
}

void CCopIntTr::on_treeGroup_customContextMenuRequested(QPoint )
{
    QAction * a=popup_grp.exec(QCursor::pos());
    if(a==a_grp_delete)
        deleteGrpItem(All);
    else if(a==a_grp_imp_cont)
        importData();
    else if(a==a_grp_entire)
        entireGroup();
    else if(a==a_grp_delw)
        deleteGrpItem(Words);
    else if(a==a_grp_dele)
        deleteGrpItem(Equivs);
    else if(a==a_grp_del)
        deleteGrpItem(Word);
}

void CCopIntTr::importData()
{
    if(!last_grid.isEmpty())
    {
        if(!last_crumid.isEmpty())
        {
            QString tbl,crid(last_crumid);
            if(crid[0]=='1')
                tbl="`coptwrd`";
            else if(crid[0]=='2')
                tbl="`coptdrv`";
            else goto showfrm;

            crid.remove(0,2);
            QString query("select `word`,`en` from "+tbl+" where `key`="+crid);
            MQUERY(q,query)
            if(q.first())
            {
                ui->txtImport->setPlainText(q.value(0)+"\n"+q.value(1));
            }
        }

        showfrm:
        ui->lblGroup->setText(tr("group id: ")+last_grid);
        ui->btShowAll->setEnabled(false);
        ui->btQuery->setEnabled(false);
        ui->stwTrees->setCurrentIndex(0);
        ui->tboxOps->setVisible(false);
    }
}

void CCopIntTr::on_btCancelUpdDb_clicked()
{
    ui->btShowAll->setEnabled(true);
    ui->btQuery->setEnabled(true);
    ui->stwTrees->setCurrentIndex(1);
    ui->tboxOps->setVisible(true);
}

void CCopIntTr::on_btUpdateDb_clicked()
{
    QStringList sl(ui->txtImport->toPlainText().split("\n",QString::SkipEmptyParts));

    for(int x=0;x<sl.count();x++)
    {
        QString w(sl[x].trimmed());

        while(w.indexOf("  ")!=-1)
            w.replace("  "," ");
        sl[x]=w;
    }
    sl.removeDuplicates();

    QString query;
    bool const copt(ui->rbUpdateW->isChecked());
    if(copt)
        query="insert into `cop_transl` (`word`,`key_group`) values ";
    else
        query="insert into `cop_encz_transl` (`en_eqv`,`cz_eqv`,`key_group`) values ";
    for(int x=0;x<sl.count();x++)
    {
        QString w(sl[x]);
        if(w.isEmpty())
            continue;

        if(copt)
            query.append("('"+w+"',"+last_grid+"),");
        else
            query.append("('"+w+"','',"+last_grid+"),");

    }
    query.chop(1);
    MQUERY(q,query)

    messages->MsgOk();
    on_btCancelUpdDb_clicked();
    execQuery("where `cop_grp_transl`.`key`="+last_grid);
}

void CCopIntTr::entireGroup()
{
    if(!last_grid.isEmpty())
        execQuery("where `cop_grp_transl`.`key`="+last_grid);
}

void CCopIntTr::on_btClean_clicked()
{
    QString d(ui->txtImport->toPlainText());
    d.remove(QString::fromUtf8("–"));
    d.remove("-");
    d.remove("+");
    d.remove("=");
    d.remove("*");
    QRegExp r("\\(.*\\)");
    r.setMinimal(true);
    d.replace(r,"\n");
    d.replace(",","\n");
    ui->txtImport->setPlainText(d);
}

void CCopIntTr::on_trWord_query()
{
    on_btQuery_clicked();
}

void CCopIntTr::on_btPar_clicked()
{
    QString nci(ui->txtNewCrumId->text());
    nci.remove(QRegExp("^.*\\-"));
    nci.prepend("3-");
    ui->txtNewCrumId->setText(nci);
}

void CCopIntTr::on_btW_clicked()
{
    QString nci(ui->txtNewCrumId->text());
    nci.remove(QRegExp("^.*\\-"));
    nci.prepend("1-");
    ui->txtNewCrumId->setText(nci);
}

void CCopIntTr::on_btD_clicked()
{
    QString nci(ui->txtNewCrumId->text());
    nci.remove(QRegExp("^.*\\-"));
    nci.prepend("2-");
    ui->txtNewCrumId->setText(nci);
}

void CCopIntTr::on_rbCop_clicked(bool checked)
{
    if(checked)
        ui->frameQ->setVisible(true);
}

void CCopIntTr::on_rbEn_clicked(bool checked)
{
    if(checked)
        ui->frameQ->setVisible(false);
}

void CCopIntTr::on_rbCz_clicked(bool checked)
{
    if(checked)
        ui->frameQ->setVisible(false);
}

void CCopIntTr::on_btCnvTxt_clicked()
{
    QString t(ui->txtImport->toPlainText());
    ui->txtImport->setText(CTranslit::tr(t,CTranslit::CopticNToCopticTr,false,CTranslit::RemoveNone));
}

bool CCopIntTr::checkDupId(short tbl,int id,int oldkey) const
{
    QString query("select count(*) from `cop_grp_transl` where `crum_table`=<tbl> and `crum_id`=<id>");

    query.replace("<tbl>",QString::number(tbl));
    query.replace("<id>",QString::number(id));

    if(oldkey!=-1)
        query.append(" and not `key`="+QString::number(oldkey));

    MQUERY_GETFIRST_RF(q,query)

    if(q.value(0).toInt()>0)
    {
        if(QMessageBox(QMessageBox::Warning,tr("coptic translator"),tr("This ID is used already!\nContinue?"),QMessageBox::Yes|QMessageBox::No,(QWidget*)this).exec()==QMessageBox::Yes)
            return true;
        else
            return false;
    }
    return true;
}

void CCopIntTr::on_btGk_clicked()
{
    QString w(ui->txtNewGrp->text());
    if(w.startsWith("(gk) "))
        w.remove(0,5);
    else
        w.prepend("(gk) ");
    ui->txtNewGrp->setText(w);
}
